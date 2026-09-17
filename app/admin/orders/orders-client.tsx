'use client'

import * as React from 'react'
import { useState, useMemo, useTransition } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  formatCurrency,
  formatCustomerWhatsAppMessage,
  formatProductionReadyWhatsAppMessage,
  formatWhatsAppLink,
  groupOrdersForKitchenProduction,
  formatOrderScheduleCompact,
  formatElapsedTime,
  groupOrdersByKanbanColumn,
  getOrderKanbanColumn,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_VARIANTS,
  PRODUCTION_STATUS_LABELS,
  PRODUCTION_STATUS_BADGE_VARIANTS,
  DELIVERY_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type Order,
  type OrderWithItems,
  type OrderStatus,
  type ProductionStatus,
  type CheckoutAddress,
  type ProductionPeriodFilter,
  type GroupedProductionDay,
  type GroupedProductionTimeSlot,
  type GroupedProductProduction,
  type ProductionItemUnit,
  type OrderKanbanColumn,
  type KanbanOrdersGroup,
} from '@/lib/domain/orders'
import {
  updateOrderStatusAction,
  updateProductionStatusAction,
  getHistoryOrdersAction,
  getHistoryOrdersCountAction,
  getOrderByIdAction,
} from './actions'
import { createClient } from '@/lib/supabase/client'
import {
  type Store,
  getStorePickupAddress,
  getStoreWhatsAppTemplates,
} from '@/lib/domain/stores'
import {
  Search,
  ShoppingBag,
  Eye,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  MapPin,
  User,
  Phone,
  Calendar,
  Truck,
  Clock,
  ChefHat,
  Store as StoreIcon,
  Check,
  RotateCcw,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Printer,
  Boxes,
  Send,
  PackageCheck,
  Flame,
  ArrowRight,
  Ban,
  History,
  Layers,
  ArrowUpRight,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface OrdersClientProps {
  initialOrders: OrderWithItems[]
  initialHistoryCounts?: { total: number; delivered: number; cancelled: number }
  store: Store | null
}

type MainTab = 'production' | 'orders'
type FilterStatus = 'all' | OrderStatus
type PeriodOption = 'today' | 'next_7_days' | 'custom'

const FILTER_TABS: { id: FilterStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'confirmed', label: 'Pagos' },
  { id: 'preparing', label: 'Em Preparo' },
  { id: 'out_for_delivery', label: 'Enviados' },
  { id: 'delivered', label: 'Entregues' },
  { id: 'cancelled', label: 'Cancelados' },
]

/**
 * Toca um alerta sonoro suave e moderno de dois tons ("ding-dong")
 * sintetizado via Web Audio API nativa do navegador, sem requisições de rede.
 */
function playNewOrderAlertSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const now = ctx.currentTime

    // Tom 1: Dó 5 (523.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // Tom 2: Sol 5 (783.99 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(783.99, now + 0.15)
    gain2.gain.setValueAtTime(0.25, now + 0.15)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.15)
    osc2.stop(now + 0.55)
  } catch {
    // Ignora silenciosamente restrições de autoplay do navegador
  }
}

export function OrdersClient({
  initialOrders,
  initialHistoryCounts,
  store,
}: OrdersClientProps) {
  const [orders, setOrders] = useState<OrderWithItems[]>(initialOrders)
  const [activeTab, setActiveTab] = useState<MainTab>('production')
  const [isPending, startTransition] = useTransition()

  // Conexão em Tempo Real (Supabase Realtime) e Notificação Sonora
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true)
  const soundEnabledRef = React.useRef(soundEnabled)

  React.useEffect(() => {
    soundEnabledRef.current = soundEnabled
  }, [soundEnabled])

  // Subscrição em Tempo Real para novos pedidos da loja
  React.useEffect(() => {
    const storeId = store?.id
    if (!storeId) return

    const supabase = createClient()
    const channelName = `admin-orders-${storeId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          const rawOrder = payload.new as Order
          if (!rawOrder || !rawOrder.id) return

          // Cria a representação otimista imediata para a lista de pedidos
          const initialNewOrder: OrderWithItems = {
            ...rawOrder,
            items: [],
            store: store,
          }

          // Adiciona o novo pedido ao topo do estado local
          setOrders((prev) => {
            if (prev.some((o) => o.id === rawOrder.id)) return prev
            return [initialNewOrder, ...prev]
          })

          // Alerta sonoro via Web Audio API (se habilitado)
          if (soundEnabledRef.current) {
            playNewOrderAlertSound()
          }

          // Notificação visual no painel
          setFeedback({
            type: 'success',
            text: `🔔 Novo pedido recebido! Pedido #${rawOrder.order_number} - ${rawOrder.customer_name}`,
          })

          // Busca dados completos (itens e loja) com tentativas para compensar inserção sequencial em order_items
          for (let attempt = 0; attempt < 4; attempt++) {
            if (attempt > 0) {
              await new Promise((resolve) => setTimeout(resolve, 350))
            }
            const res = await getOrderByIdAction({ order_id: rawOrder.id })
            if (res.success && res.data) {
              const fullOrder = res.data
              setOrders((prev) =>
                prev.map((o) => (o.id === fullOrder.id ? fullOrder : o))
              )
              setSelectedOrder((prevSelected) =>
                prevSelected && prevSelected.id === fullOrder.id ? fullOrder : prevSelected
              )
              if (fullOrder.items && fullOrder.items.length > 0) {
                break
              }
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true)
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false)
        }
      })

    // Encerramento limpo da conexão WebSocket ao desmontar o componente
    return () => {
      supabase.removeChannel(channel)
    }
  }, [store?.id, store])

  // Templates de WhatsApp configurados pela loja
  const storeTemplates = useMemo(() => getStoreWhatsAppTemplates(store), [store])

  // Data base de referência
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  // Filtro de Período da Cozinha
  const [periodOption, setPeriodOption] = useState<PeriodOption>('today')
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr)
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })

  // Estado de Expansão dos Cards de Dia (Sanfona)
  const [dayExpandedMap, setDayExpandedMap] = useState<Record<string, boolean>>({})

  // Estado de Expansão dos Cards de Faixa de Horário
  const [slotExpandedMap, setSlotExpandedMap] = useState<Record<string, boolean>>({})

  // Estado de Expansão dos Cards de Produto
  const [productExpandedMap, setProductExpandedMap] = useState<Record<string, boolean>>({})

  // Busca e Filtros da Aba "📜 Pedidos"
  const [search, setSearch] = useState('')

  // Ticker para atualização em tempo real do tempo decorrido
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now())
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  // Checklist de Embalagem dos Itens do Pedido
  const [packedItemsMap, setPackedItemsMap] = useState<Record<string, boolean>>({})

  const togglePackedItem = (itemId: string) => {
    setPackedItemsMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  // Modal de Detalhes
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Objeto de filtro de período formatado
  const activePeriodFilter: ProductionPeriodFilter = useMemo(() => {
    if (periodOption === 'today') return { type: 'today' }
    if (periodOption === 'next_7_days') return { type: 'next_7_days' }
    return {
      type: 'custom',
      startDate: customStartDate,
      endDate: customEndDate,
    }
  }, [periodOption, customStartDate, customEndDate])

  // Estado de status por unidade individual (All-Day KDS)
  const [unitStatusMap, setUnitStatusMap] = useState<Record<string, ProductionStatus>>({})

  // Agrupamento dos pedidos para a Cozinha com status dinâmico por unidade
  const groupedProductionDays: GroupedProductionDay[] = useMemo(() => {
    const rawDays = groupOrdersForKitchenProduction(orders, activePeriodFilter, todayStr)

    return rawDays.map((day) => {
      let dayTotalUnits = 0
      let dayReadyUnits = 0

      const mapProductItems = (prod: GroupedProductProduction) => {
        let readyUnitsCount = 0

        const items = prod.items.map((item) => {
          // Status efetivo da unidade individual: respeita o mapa local se houver, ou reflete o status do pedido se pronto/entregue, senão permanece pendente
          const currentStatus: ProductionStatus =
            unitStatusMap[item.id] !== undefined
              ? unitStatusMap[item.id]
              : item.productionStatus === 'ready' || item.productionStatus === 'delivered'
              ? item.productionStatus
              : 'pending'

          if (currentStatus === 'ready' || currentStatus === 'delivered') {
            readyUnitsCount++
          }
          return {
            ...item,
            productionStatus: currentStatus,
          }
        })

        const totalUnits = prod.totalQuantity
        const isAllReady = readyUnitsCount === totalUnits && totalUnits > 0
        const pendingUnits = Math.max(0, totalUnits - readyUnitsCount)

        return {
          ...prod,
          items,
          readyQuantity: readyUnitsCount,
          pendingQuantity: pendingUnits,
          isAllReady,
        }
      }

      const products = day.products.map((prod) => {
        const mapped = mapProductItems(prod)
        dayTotalUnits += mapped.totalQuantity
        dayReadyUnits += mapped.readyQuantity
        return mapped
      })

      const timeSlots = day.timeSlots.map((slot) => {
        let slotTotalUnits = 0
        let slotReadyUnits = 0

        const slotProducts = slot.products.map((prod) => {
          const mapped = mapProductItems(prod)
          slotTotalUnits += mapped.totalQuantity
          slotReadyUnits += mapped.readyQuantity
          return mapped
        })

        const isAllReady = slotReadyUnits === slotTotalUnits && slotTotalUnits > 0

        return {
          ...slot,
          products: slotProducts,
          totalQuantity: slotTotalUnits,
          readyQuantity: slotReadyUnits,
          pendingQuantity: Math.max(0, slotTotalUnits - slotReadyUnits),
          isAllReady,
        }
      })

      return {
        ...day,
        products,
        timeSlots,
      }
    })
  }, [orders, activePeriodFilter, todayStr, unitStatusMap])

  // Alternar expansão do Card do Dia
  const toggleDayExpansion = (dateStr: string, currentIsAllReady: boolean) => {
    setDayExpandedMap((prev) => {
      const current = prev[dateStr] !== undefined ? prev[dateStr] : !currentIsAllReady
      return {
        ...prev,
        [dateStr]: !current,
      }
    })
  }

  // Alternar expansão do Card de Faixa de Horário
  const toggleSlotExpansion = (slotKey: string, currentIsAllReady: boolean) => {
    setSlotExpandedMap((prev) => {
      const current = prev[slotKey] !== undefined ? prev[slotKey] : !currentIsAllReady
      return {
        ...prev,
        [slotKey]: !current,
      }
    })
  }

  // Alternar expansão do Card do Produto
  const toggleProductExpansion = (key: string) => {
    setProductExpandedMap((prev) => {
      const current = prev[key] !== undefined ? prev[key] : true
      return {
        ...prev,
        [key]: !current,
      }
    })
  }

  // Atualizar Status de Produção por Unidade (All-Day) e sincronizar o Pedido
  const handleUnitProductionStatusChange = (
    unit: ProductionItemUnit,
    targetDayDate: string,
    newStatus: ProductionStatus
  ) => {
    setFeedback(null)

    // 1. Atualiza mapa de unidades
    const nextUnitStatusMap = {
      ...unitStatusMap,
      [unit.id]: newStatus,
    }
    setUnitStatusMap(nextUnitStatusMap)

    // 2. Localizar todas as unidades pertencentes a esse pedido no dia
    const currentDay = groupedProductionDays.find((d) => d.date === targetDayDate)
    const allOrderUnits: ProductionItemUnit[] = []
    if (currentDay) {
      currentDay.products.forEach((p) => {
        p.items.forEach((item) => {
          if (item.orderId === unit.orderId) {
            allOrderUnits.push(item)
          }
        })
      })
    }

    // 3. Determinar o status geral do pedido
    let targetOrderStatus: ProductionStatus = newStatus
    if (allOrderUnits.length > 0) {
      const statuses = allOrderUnits.map((u) => {
        if (u.id === unit.id) return newStatus
        if (nextUnitStatusMap[u.id] !== undefined) return nextUnitStatusMap[u.id]
        if (u.productionStatus === 'ready' || u.productionStatus === 'delivered') {
          return u.productionStatus
        }
        return 'pending'
      })
      const allReady = statuses.every((s) => s === 'ready' || s === 'delivered')
      const anyProgress = statuses.some(
        (s) => s === 'ready' || s === 'preparing' || s === 'delivered'
      )

      if (allReady) {
        targetOrderStatus = 'ready'
      } else if (anyProgress) {
        targetOrderStatus = 'preparing'
      } else {
        targetOrderStatus = 'pending'
      }
    }

    // 4. Atualização Otimista imediata no pedido
    const nextOrders = orders.map((order) =>
      order.id === unit.orderId ? { ...order, production_status: targetOrderStatus } : order
    )
    setOrders(nextOrders)

    // 5. Verificar se o dia atingiu 100% de conclusão para auto-collapse
    const dayOrders = nextOrders.filter((o) => {
      if (o.status === 'cancelled') return false
      const d = o.scheduled_date || (o.created_at ? o.created_at.split('T')[0] : todayStr)
      return d === targetDayDate
    })

    const isDayCompletedNow =
      dayOrders.length > 0 &&
      dayOrders.every(
        (o) => o.production_status === 'ready' || o.production_status === 'delivered'
      )

    if (isDayCompletedNow) {
      setDayExpandedMap((prev) => ({
        ...prev,
        [targetDayDate]: false,
      }))
    }

    // 6. Persistência no Backend via Server Action
    startTransition(async () => {
      const res = await updateProductionStatusAction({
        order_id: unit.orderId,
        production_status: targetOrderStatus,
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated)
        }
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao atualizar status de produção.',
        })
        setOrders(orders)
      }
    })
  }

  // Atualizar Status de Produção de um Pedido Inteiro (ex: via lista geral)
  const handleQuickProductionStatusChange = (
    orderId: string,
    targetDayDate: string,
    newStatus: ProductionStatus
  ) => {
    setFeedback(null)

    // Atualização Otimista Imediata
    const nextOrders = orders.map((order) =>
      order.id === orderId ? { ...order, production_status: newStatus } : order
    )
    setOrders(nextOrders)

    // Atualizar mapa de unidades vinculadas a esse pedido
    setUnitStatusMap((prev) => {
      const updated = { ...prev }
      const currentDay = groupedProductionDays.find((d) => d.date === targetDayDate)
      if (currentDay) {
        currentDay.products.forEach((p) => {
          p.items.forEach((item) => {
            if (item.orderId === orderId) {
              updated[item.id] = newStatus
            }
          })
        })
      }
      return updated
    })

    // Verificar se o dia atingiu 100% de conclusão
    const dayOrders = nextOrders.filter((o) => {
      if (o.status === 'cancelled') return false
      const d =
        o.scheduled_date || (o.created_at ? o.created_at.split('T')[0] : todayStr)
      return d === targetDayDate
    })

    const isDayCompletedNow =
      dayOrders.length > 0 &&
      dayOrders.every(
        (o) => o.production_status === 'ready' || o.production_status === 'delivered'
      )

    if (isDayCompletedNow) {
      setDayExpandedMap((prev) => ({
        ...prev,
        [targetDayDate]: false,
      }))
    }

    // Persistência no Backend via Server Action
    startTransition(async () => {
      const res = await updateProductionStatusAction({
        order_id: orderId,
        production_status: newStatus,
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated)
        }
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao atualizar status de produção.',
        })
        setOrders(orders)
      }
    })
  }

  // Atualizar Status Comercial do Pedido
  const handleUpdateOrderStatus = (orderId: string, statusToSet: OrderStatus) => {
    setFeedback(null)

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: orderId,
        status: statusToSet,
      })

      if (res.success && res.data) {
        setFeedback({ type: 'success', text: res.message })
        const updated = res.data

        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )

        if (selectedOrder && selectedOrder.id === updated.id) {
          setSelectedOrder(updated)
        }
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const handleOpenDetails = (order: OrderWithItems) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  // Filtros específicos do Kanban de Pedidos Ativos
  const [deliveryTypeFilter, setDeliveryTypeFilter] = useState<'all' | 'delivery' | 'pickup'>('all')
  const [mobileColumnTab, setMobileColumnTab] = useState<OrderKanbanColumn>('awaiting_confirmation')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // Contagens do Histórico de Pedidos
  const [historyCounts, setHistoryCounts] = useState<{
    total: number
    delivered: number
    cancelled: number
  }>(
    initialHistoryCounts || {
      total: 0,
      delivered: 0,
      cancelled: 0,
    }
  )

  // Estados de Paginação e Filtros do Histórico (Server-Side)
  const [historyOrders, setHistoryOrders] = useState<OrderWithItems[]>([])
  const [historyPage, setHistoryPage] = useState<number>(1)
  const [historyPageSize] = useState<number>(10)
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1)
  const [historyTotalCount, setHistoryTotalCount] = useState<number>(
    initialHistoryCounts?.total || 0
  )
  const [historySearch, setHistorySearch] = useState<string>('')
  const [historyStatusFilter, setHistoryStatusFilter] = useState<
    'all' | 'delivered' | 'cancelled'
  >('all')
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)

  // Função para buscar histórico paginado no servidor
  const fetchHistory = React.useCallback(
    async (
      pageToFetch: number,
      searchQuery: string,
      statusToFilter: 'all' | 'delivered' | 'cancelled'
    ) => {
      setIsLoadingHistory(true)
      try {
        const res = await getHistoryOrdersAction({
          page: pageToFetch,
          pageSize: historyPageSize,
          search: searchQuery.trim() || undefined,
          statusFilter: statusToFilter,
        })

        if (res.success && res.data) {
          setHistoryOrders(res.data.orders)
          setHistoryTotalCount(res.data.totalCount)
          setHistoryTotalPages(res.data.totalPages)
          setHistoryPage(res.data.page)
        }
      } catch (err) {
        console.error('[fetchHistory] Erro ao carregar histórico paginado:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    },
    [historyPageSize]
  )

  // Carregar histórico sob demanda quando aberto ou quando filtros/página mudam
  React.useEffect(() => {
    if (isHistoryOpen) {
      const timer = setTimeout(() => {
        fetchHistory(historyPage, historySearch, historyStatusFilter)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [isHistoryOpen, historyPage, historySearch, historyStatusFilter, fetchHistory])

  // 1. Mover de "Aguardando confirmação" para "Preparando"
  const handleApproveOrder = (order: OrderWithItems) => {
    setFeedback(null)
    const targetStatus: OrderStatus = 'preparing'

    // Otimista
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: targetStatus,
              production_status: 'preparing',
              payment_status: o.payment_status === 'pending' ? 'paid' : o.payment_status,
            }
          : o
      )
    )

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: targetStatus,
        production_status: 'preparing',
        payment_status: 'paid',
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} aprovado e enviado para Preparo!`,
        })
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao aprovar pedido.',
        })
      }
    })
  }

  // 2. Mover de "Preparando" para "Pronto"
  const handleMarkAsReady = (order: OrderWithItems) => {
    setFeedback(null)
    const isPickup = (order.delivery_method || order.delivery_type) === 'pickup'
    const targetStatus: OrderStatus = isPickup ? 'ready_for_pickup' : 'preparing'

    // Otimista
    setOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              status: targetStatus,
              production_status: 'ready',
            }
          : o
      )
    )

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: targetStatus,
        production_status: 'ready',
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} marcado como Pronto!`,
        })
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao marcar pedido como pronto.',
        })
      }
    })
  }

  // 3. Mover de "Pronto" para "Entregue" (Despachar)
  const handleDispatchOrder = (order: OrderWithItems) => {
    setFeedback(null)
    const targetStatus: OrderStatus = 'delivered'

    // Otimista: remove dos ativos e incrementa contagem do histórico
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setHistoryCounts((prev) => ({
      ...prev,
      total: prev.total + 1,
      delivered: prev.delivered + 1,
    }))

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: targetStatus,
        production_status: 'delivered',
        payment_status: 'paid',
      })

      if (res.success && res.data) {
        const updated = res.data
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} despachado com sucesso!`,
        })
        if (isHistoryOpen) {
          fetchHistory(historyPage, historySearch, historyStatusFilter)
        }
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao despachar pedido.',
        })
      }
    })
  }

  // 4. Voltar de "Pronto" para "Preparando"
  const handleRevertToPreparing = (order: OrderWithItems) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: 'preparing',
        production_status: 'preparing',
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} retornado para Preparo.`,
        })
      }
    })
  }

  // 5. Voltar de "Preparando" para "Aguardando confirmação"
  const handleRevertToPending = (order: OrderWithItems) => {
    setFeedback(null)
    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: 'pending',
        production_status: 'pending',
      })

      if (res.success && res.data) {
        const updated = res.data
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))
        )
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} retornado para Aguardando Confirmação.`,
        })
      }
    })
  }

  // 6. Cancelar Pedido
  const handleCancelOrder = (order: OrderWithItems) => {
    if (!window.confirm(`Tem certeza que deseja cancelar o Pedido #${order.order_number}?`)) {
      return
    }
    setFeedback(null)

    // Otimista: remove dos ativos e incrementa cancelados no histórico
    setOrders((prev) => prev.filter((o) => o.id !== order.id))
    setHistoryCounts((prev) => ({
      ...prev,
      total: prev.total + 1,
      cancelled: prev.cancelled + 1,
    }))

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: 'cancelled',
      })

      if (res.success && res.data) {
        const updated = res.data
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} cancelado.`,
        })
        if (isHistoryOpen) {
          fetchHistory(historyPage, historySearch, historyStatusFilter)
        }
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'Erro ao cancelar pedido.',
        })
      }
    })
  }

  // 7. Reabrir Pedido Finalizado
  const handleReopenOrder = (order: OrderWithItems) => {
    setFeedback(null)

    startTransition(async () => {
      const res = await updateOrderStatusAction({
        order_id: order.id,
        status: 'preparing',
        production_status: 'preparing',
      })

      if (res.success && res.data) {
        const updated = res.data
        // Adiciona de volta aos ativos
        setOrders((prev) => [updated, ...prev])
        setHistoryCounts((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          cancelled: order.status === 'cancelled' ? Math.max(0, prev.cancelled - 1) : prev.cancelled,
          delivered: order.status === 'delivered' ? Math.max(0, prev.delivered - 1) : prev.delivered,
        }))
        setFeedback({
          type: 'success',
          text: `Pedido #${updated.order_number} reaberto e movido para Preparando!`,
        })
        if (isHistoryOpen) {
          fetchHistory(historyPage, historySearch, historyStatusFilter)
        }
      }
    })
  }

  // Filtragem e agrupamento para o Kanban Ativo
  const kanbanFilteredOrders = useMemo(() => {
    let list = orders
    if (deliveryTypeFilter !== 'all') {
      list = list.filter(
        (o) => (o.delivery_method || o.delivery_type) === deliveryTypeFilter
      )
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((order) => {
        const matchNumber = order.order_number.toString().includes(q)
        const matchName = order.customer_name.toLowerCase().includes(q)
        const matchPhone = order.customer_phone.toLowerCase().includes(q)
        return matchNumber || matchName || matchPhone
      })
    }
    return list
  }, [orders, deliveryTypeFilter, search])

  const kanbanGroups = useMemo(() => {
    return groupOrdersByKanbanColumn(kanbanFilteredOrders)
  }, [kanbanFilteredOrders])

  const activeKanbanOrdersCount =
    kanbanGroups.awaitingConfirmation.length +
    kanbanGroups.preparing.length +
    kanbanGroups.ready.length

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* SELETOR DE ABAS PRINCIPAL (2 ABAS) + STATUS REALTIME */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Abas */}
        <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl border border-neutral-200/80 w-full sm:w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'production'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 bg-transparent'
            }`}
          >
            <ChefHat className="size-4" />
            <span>👨‍🍳 Produção do Dia</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900 bg-transparent'
            }`}
          >
            <ShoppingBag className="size-4" />
            <span>📜 Pedidos ({orders.length})</span>
          </button>
        </div>

        {/* Indicador de Tempo Real & Botão de Áudio */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
              isRealtimeConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs'
                : 'bg-neutral-50 text-neutral-500 border-neutral-200/80'
            }`}
            title={
              isRealtimeConnected
                ? 'Conexão em tempo real ativa. Novos pedidos aparecem automaticamente!'
                : 'Conectando ao canal em tempo real...'
            }
          >
            <span className="relative flex h-2 w-2">
              {isRealtimeConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isRealtimeConnected ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
            </span>
            <span className="font-semibold">{isRealtimeConnected ? 'Ao Vivo' : 'Conectando...'}</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={
              soundEnabled
                ? 'Alerta sonoro ativo para novos pedidos (clique para silenciar)'
                : 'Alerta sonoro silenciado (clique para ativar)'
            }
            className={`p-2 rounded-xl border text-xs transition-colors flex items-center justify-center ${
              soundEnabled
                ? 'bg-white border-neutral-200/90 text-emerald-600 hover:bg-neutral-50 shadow-2xs'
                : 'bg-neutral-100 border-neutral-200/80 text-neutral-400 hover:text-neutral-600'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="size-4 text-emerald-600" />
            ) : (
              <VolumeX className="size-4 text-neutral-400" />
            )}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: 👨‍🍳 PRODUÇÃO DO DIA (EXPERIÊNCIA DE COZINHA)        */}
      {/* ============================================================ */}
      {activeTab === 'production' && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* FILTRO DE PERÍODO */}
          <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 mr-1 flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-neutral-700" />
                  Período de Produção:
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPeriodOption('today')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors ${
                    periodOption === 'today'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Hoje
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPeriodOption('next_7_days')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors ${
                    periodOption === 'next_7_days'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Próximos 7 dias
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPeriodOption('custom')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors ${
                    periodOption === 'custom'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Intervalo Personalizado
                </Button>
              </div>

              {/* Seletor de Datas Personalizadas */}
              {periodOption === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-neutral-200">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                    <span>De:</span>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="h-8 text-xs w-36 bg-white border-neutral-200"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                    <span>Até:</span>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="h-8 text-xs w-36 bg-white border-neutral-200"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE CARDS DE DIA AGRUPADOS */}
          {groupedProductionDays.length === 0 ? (
            <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white p-12 text-center space-y-3">
              <div className="size-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
                <ChefHat className="size-6" />
              </div>
              <h3 className="font-semibold text-neutral-900 text-base">
                Nenhum pedido sob encomenda agendado para o período selecionado
              </h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Não há encomendas programadas para este intervalo de datas. Pedidos de pronta-entrega são acompanhados na aba &quot;📜 Pedidos&quot;.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPeriodOption('next_7_days')}
                  className="text-xs bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 font-medium"
                >
                  Ver Próximos 7 dias
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {groupedProductionDays.map((day) => {
                // Se o dia estiver em dayExpandedMap usa o valor, senão usa !day.isAllReady (auto-collapse)
                const isExpanded =
                  dayExpandedMap[day.date] !== undefined
                    ? dayExpandedMap[day.date]
                    : !day.isAllReady

                const progressPercentage =
                  day.totalOrders > 0
                    ? Math.round((day.readyOrders / day.totalOrders) * 100)
                    : 0

                return (
                  <div
                    key={day.date}
                    className={`border transition-all duration-200 overflow-hidden rounded-xl shadow-xs ${
                      day.isAllReady
                        ? 'border-neutral-200 bg-neutral-50/60 text-neutral-500 opacity-90'
                        : 'border-neutral-200/80 bg-white'
                    }`}
                  >
                    {/* CABEÇALHO DO CARD DO DIA (SANFONADO / EXPANSÍVEL) */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleDayExpansion(day.date, day.isAllReady)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleDayExpansion(day.date, day.isAllReady)
                        }
                      }}
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors hover:bg-neutral-50/80 ${
                        isExpanded ? 'border-b border-neutral-200/80' : ''
                      }`}
                    >
                      {/* Lado Esquerdo: Data por Extenso e Badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div
                          className={`size-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            day.isAllReady
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          <Calendar className="size-4.5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-neutral-900 font-heading">
                              {day.formattedDate}
                            </h2>

                            {day.isToday && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white">
                                Hoje
                              </span>
                            )}

                            {day.isTomorrow && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 border border-neutral-200 text-neutral-700">
                                Amanhã
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-neutral-500 mt-0.5">
                            {day.products.reduce((acc, p) => acc + p.totalQuantity, 0)}{' '}
                            unidades a preparar em {day.totalOrders}{' '}
                            {day.totalOrders === 1 ? 'encomenda' : 'encomendas'} • {day.timeSlots.length}{' '}
                            {day.timeSlots.length === 1 ? 'horário de entrega' : 'horários de entrega'}
                          </p>
                        </div>
                      </div>

                      {/* Lado Direito: Progresso Visual e Indicador de Conclusão */}
                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="flex flex-col items-end gap-1.5 min-w-[140px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold tabular-nums ${
                                day.isAllReady
                                  ? 'text-emerald-800'
                                  : 'text-neutral-900'
                              }`}
                            >
                              {day.readyOrders} / {day.totalOrders} pedidos prontos
                            </span>

                            {day.isAllReady && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="size-3.5" />
                                Concluído
                              </span>
                            )}
                          </div>

                          {/* Mini Barra de Progresso */}
                          <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                day.isAllReady
                                  ? 'bg-emerald-700'
                                  : 'bg-neutral-900'
                              }`}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Botão Ícone de Expandir/Recolher */}
                        <div className="text-neutral-500 p-1 rounded-lg hover:bg-neutral-100 shrink-0 transition-transform">
                          {isExpanded ? (
                            <ChevronUp className="size-5" />
                          ) : (
                            <ChevronDown className="size-5" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CONTEÚDO EXPANSÍVEL: RESUMO DO DIA E HORÁRIOS DE ENTREGA INTEGRADOS */}
                    {isExpanded && (
                      <div className="bg-white divide-y divide-neutral-200 animate-in fade-in-50 duration-200">
                        {/* 1. Resumo Geral de Produtos do Dia (Fora de card, sem ícone, destaque para itens e quantidades) */}
                        <div className="p-4 sm:p-5 space-y-2.5 bg-neutral-50/50">
                          <div className="text-xs uppercase tracking-wider font-bold text-neutral-600">
                            Itens para produção do dia:
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {day.products.map((prod) => (
                              <div
                                key={prod.productKey}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                                  prod.isAllReady
                                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                                    : 'bg-white text-neutral-900 border-neutral-300 shadow-2xs'
                                }`}
                              >
                                <span className="font-extrabold text-base sm:text-lg font-mono tabular-nums text-neutral-950">
                                  {prod.totalQuantity}x
                                </span>
                                <span className="font-bold text-neutral-900 text-sm">
                                  {prod.productName}
                                </span>
                                {prod.isAllReady && (
                                  <span className="text-xs text-emerald-700 font-bold ml-0.5">✓</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 2. Seções de Horário de Entrega Integradas ao Fundo do Card (Estilo Planilha Excel) */}
                        <div className="divide-y divide-neutral-200">
                          {day.timeSlots.map((slot, slotIdx) => {
                            const slotKey = `${day.date}_slot_${slot.timeSlot}`
                            const isSlotExpanded =
                              slotExpandedMap[slotKey] !== undefined
                                ? slotExpandedMap[slotKey]
                                : !slot.isAllReady

                            const isEvenSlot = slotIdx % 2 === 0
                            const slotBg = isEvenSlot ? 'bg-white' : 'bg-neutral-100'
                            const slotHeaderBg = isEvenSlot
                              ? 'bg-white hover:bg-neutral-50'
                              : 'bg-neutral-100 hover:bg-neutral-200/70'
                            const productHeaderBg = isEvenSlot ? 'bg-white' : 'bg-neutral-100'
                            const itemRowBg = isEvenSlot
                              ? 'bg-white hover:bg-neutral-50'
                              : 'bg-neutral-100 hover:bg-neutral-200/60'

                            return (
                              <div key={slot.timeSlot} className={slotBg}>
                                {/* Cabeçalho da Faixa de Horário Integrado ao Card (Mesma cor do bloco) */}
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => toggleSlotExpansion(slotKey, slot.isAllReady)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      toggleSlotExpansion(slotKey, slot.isAllReady)
                                    }
                                  }}
                                  className={`px-4 sm:px-5 py-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none border-b border-neutral-200 ${slotHeaderBg}`}
                                >
                                  {/* Lado Esquerdo: Horário e Quantidades */}
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    <span className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                                      {slot.label}
                                    </span>

                                    <span className="text-xs text-neutral-600 font-medium">
                                      • {slot.totalQuantity} {slot.totalQuantity === 1 ? 'item' : 'itens'} a produzir ({slot.totalOrders}{' '}
                                      {slot.totalOrders === 1 ? 'pedido' : 'pedidos'})
                                    </span>
                                  </div>

                                  {/* Lado Direito: Status e Quantidade de Prontos */}
                                  <div className="flex items-center gap-3 self-end sm:self-center">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`text-xs font-bold font-mono tabular-nums ${
                                          slot.isAllReady
                                            ? 'text-emerald-800'
                                            : slot.readyQuantity > 0
                                            ? 'text-sky-800'
                                            : 'text-neutral-800'
                                        }`}
                                      >
                                        {slot.readyQuantity} / {slot.totalQuantity} prontos
                                      </span>

                                      <span
                                        className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                                          slot.isAllReady
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                            : slot.readyQuantity > 0
                                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                                            : isEvenSlot
                                            ? 'bg-neutral-100 text-neutral-700 border-neutral-200'
                                            : 'bg-white text-neutral-700 border-neutral-300'
                                        }`}
                                      >
                                        {slot.isAllReady
                                          ? '✓ Pronto'
                                          : slot.readyQuantity > 0
                                          ? 'Em Preparo'
                                          : 'Pendente'}
                                      </span>
                                    </div>

                                    <div className="text-neutral-500 p-0.5 rounded">
                                      {isSlotExpanded ? (
                                        <ChevronUp className="size-4" />
                                      ) : (
                                        <ChevronDown className="size-4" />
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Conteúdo do Horário: Cards de Produtos com Hierarquia Visual de Pedidos */}
                                {isSlotExpanded && (
                                  <div className="p-3.5 sm:p-4 space-y-3.5">
                                    {slot.products.map((product) => {
                                      return (
                                        <div
                                          key={product.productKey}
                                          className={`border rounded-xl shadow-2xs overflow-hidden transition-all ${
                                            product.isAllReady
                                              ? 'border-emerald-200 bg-emerald-50/20'
                                              : isEvenSlot
                                              ? 'border-neutral-200/90 bg-white'
                                              : 'border-neutral-300/80 bg-neutral-100'
                                          }`}
                                        >
                                          {/* Cabeçalho do Card do Produto (Mesma cor do fundo do horário) */}
                                          <div className={`px-4 py-2.5 border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${productHeaderBg}`}>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                              <span className="font-bold text-sm sm:text-base text-neutral-900 font-heading">
                                                {product.productName}
                                              </span>
                                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md font-mono border ${isEvenSlot ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-white border-neutral-300 text-neutral-700'}`}>
                                                {product.totalQuantity}{' '}
                                                {product.totalQuantity === 1 ? 'unidade' : 'unidades'}
                                              </span>
                                            </div>

                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                              <span
                                                className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md border tabular-nums ${
                                                  product.isAllReady
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : product.readyQuantity > 0
                                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                                    : isEvenSlot
                                                    ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                                    : 'bg-white text-neutral-600 border-neutral-300'
                                                }`}
                                              >
                                                {product.readyQuantity} / {product.totalQuantity} prontos
                                              </span>

                                              <span
                                                className={`text-[11px] font-semibold px-2 py-0.5 rounded border hidden sm:inline-flex ${
                                                  product.isAllReady
                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                    : product.readyQuantity > 0
                                                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                                                    : isEvenSlot
                                                    ? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                                    : 'bg-white text-neutral-600 border-neutral-200'
                                                }`}
                                              >
                                                {product.isAllReady
                                                  ? '✓ Concluído'
                                                  : product.readyQuantity > 0
                                                  ? 'Em Preparo'
                                                  : 'Pendente'}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Lista de Pedidos / Unidades deste Produto (Hierarquia Visual com cor do horário) */}
                                          <div className={`divide-y divide-neutral-200/60 ${isEvenSlot ? 'bg-white' : 'bg-neutral-100'}`}>
                                            {product.items.map((item) => {
                                              const isReady =
                                                item.productionStatus === 'ready' ||
                                                item.productionStatus === 'delivered'
                                              const isPreparing =
                                                item.productionStatus === 'preparing'
                                              const isPendingStatus =
                                                item.productionStatus === 'pending'

                                              const orderForMsg = orders.find((o) => o.id === item.orderId)
                                              const readyMsg = orderForMsg
                                                ? formatProductionReadyWhatsAppMessage(
                                                    orderForMsg,
                                                    store?.name,
                                                    getStorePickupAddress(store),
                                                    storeTemplates
                                                  )
                                                : ''
                                              const whatsAppLink = formatWhatsAppLink(
                                                item.customerPhone,
                                                readyMsg
                                              )

                                              return (
                                                <div
                                                  key={item.id}
                                                  className={`p-3 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                                                    isReady
                                                      ? 'bg-emerald-50/30'
                                                      : isPreparing
                                                      ? 'bg-sky-50/20'
                                                      : isEvenSlot
                                                      ? 'bg-white hover:bg-neutral-50/80'
                                                      : 'bg-neutral-100 hover:bg-neutral-200/60'
                                                  }`}
                                                >
                                                  {/* Informações do Pedido do Produto */}
                                                  <div className="space-y-1.5 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                                      {/* Identificador de Unidade */}
                                                      {item.totalUnitsInItem > 1 && (
                                                        <span className={`font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded border ${isEvenSlot ? 'bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-white border-neutral-300 text-neutral-700'}`}>
                                                          Unidade {item.unitIndex}/{item.totalUnitsInItem}
                                                        </span>
                                                      )}

                                                      {/* Método de Entrega */}
                                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border text-neutral-700 ${isEvenSlot ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-300'}`}>
                                                        {item.deliveryMethod === 'delivery' ? (
                                                          <>
                                                            <Truck className="size-3" />
                                                            🚚 Entrega
                                                          </>
                                                        ) : (
                                                          <>
                                                            <StoreIcon className="size-3" />
                                                            🏪 Retirada
                                                          </>
                                                        )}
                                                      </span>

                                                      {/* Cliente e Número do Pedido */}
                                                      <span className="font-bold text-neutral-900 text-xs">
                                                        👤 {item.customerName}
                                                      </span>

                                                      <span className={`font-mono font-medium text-neutral-600 px-1.5 py-0.5 rounded text-[11px] border ${isEvenSlot ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-300'}`}>
                                                        #{item.orderNumber}
                                                      </span>

                                                      {/* Origem: Combo vs Encomenda Avulsa */}
                                                      {item.isComboItem && item.comboName ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                          🎁 Combo: {item.comboName}
                                                        </span>
                                                      ) : (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-neutral-600 border ${isEvenSlot ? 'bg-neutral-100 border-neutral-200' : 'bg-white border-neutral-300'}`}>
                                                          🛒 Encomenda Avulsa
                                                        </span>
                                                      )}
                                                    </div>

                                                    {/* Observações / Customizações */}
                                                    {item.notes && (
                                                      <div className="text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80 inline-block">
                                                        📝 <span className="font-semibold">Obs:</span> {item.notes}
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* Ações de Produção: Pendente / Em Preparo / Pronto */}
                                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0">
                                                    {/* 1. Botão Pendente */}
                                                    <button
                                                      type="button"
                                                      disabled={isPending}
                                                      onClick={() =>
                                                        handleUnitProductionStatusChange(
                                                          item,
                                                          day.date,
                                                          'pending'
                                                        )
                                                      }
                                                      className={`text-xs h-7 px-2.5 font-medium rounded transition-colors border ${
                                                        isPendingStatus
                                                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold shadow-2xs'
                                                          : isEvenSlot
                                                          ? 'bg-white text-neutral-600 border-neutral-200 hover:bg-amber-50 hover:text-amber-800'
                                                          : 'bg-white text-neutral-600 border-neutral-300 hover:bg-amber-50 hover:text-amber-800'
                                                      }`}
                                                    >
                                                      Pendente
                                                    </button>

                                                    {/* 2. Botão Em Preparo */}
                                                    <button
                                                      type="button"
                                                      disabled={isPending}
                                                      onClick={() =>
                                                        handleUnitProductionStatusChange(
                                                          item,
                                                          day.date,
                                                          'preparing'
                                                        )
                                                      }
                                                      className={`text-xs h-7 px-2.5 font-medium rounded transition-colors border ${
                                                        isPreparing
                                                          ? 'bg-sky-100 text-sky-900 border-sky-300 font-semibold shadow-2xs'
                                                          : isEvenSlot
                                                          ? 'bg-white text-neutral-600 border-neutral-200 hover:bg-sky-50 hover:text-sky-800'
                                                          : 'bg-white text-neutral-600 border-neutral-300 hover:bg-sky-50 hover:text-sky-800'
                                                      }`}
                                                    >
                                                      Em Preparo
                                                    </button>

                                                    {/* 3. Botão Pronto */}
                                                    <button
                                                      type="button"
                                                      disabled={isPending}
                                                      onClick={() =>
                                                        handleUnitProductionStatusChange(
                                                          item,
                                                          day.date,
                                                          'ready'
                                                        )
                                                      }
                                                      className={`text-xs h-7 px-2.5 font-medium rounded transition-colors border inline-flex items-center gap-1 ${
                                                        isReady
                                                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold shadow-2xs'
                                                          : isEvenSlot
                                                          ? 'bg-white text-neutral-600 border-neutral-200 hover:bg-emerald-50 hover:text-emerald-800'
                                                          : 'bg-white text-neutral-600 border-neutral-300 hover:bg-emerald-50 hover:text-emerald-800'
                                                      }`}
                                                    >
                                                      <Check className="size-3 mr-0.5" />
                                                      Pronto
                                                    </button>

                                                    {/* Atalho WhatsApp */}
                                                    {isReady && whatsAppLink && (
                                                      <a
                                                        href={whatsAppLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Avisar cliente no WhatsApp"
                                                        className="inline-flex items-center justify-center h-7 px-2.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition-colors"
                                                      >
                                                        <MessageCircle className="size-3.5 mr-1" />
                                                        <span>Avisar</span>
                                                      </a>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: 📜 PEDIDOS (KANBAN DE 3 COLUNAS: AGUARDANDO, PREPARANDO, PRONTO) */}
      {/* ============================================================ */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* BARRA SUPERIOR DE CONTROLE E FILTROS */}
          <div className="border border-neutral-200/80 rounded-2xl shadow-xs bg-white p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Lado Esquerdo: Filtros por Modalidade de Entrega */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-neutral-500 mr-1 hidden sm:inline">
                  Modalidade:
                </span>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDeliveryTypeFilter('all')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors ${
                    deliveryTypeFilter === 'all'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  Todos ({activeKanbanOrdersCount})
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDeliveryTypeFilter('delivery')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors flex items-center gap-1.5 ${
                    deliveryTypeFilter === 'delivery'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <Truck className="size-3.5" />
                  <span>Delivery</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDeliveryTypeFilter('pickup')}
                  className={`text-xs font-medium h-8 rounded-lg transition-colors flex items-center gap-1.5 ${
                    deliveryTypeFilter === 'pickup'
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-xs'
                      : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <StoreIcon className="size-3.5" />
                  <span>Retirada</span>
                </Button>
              </div>

              {/* Lado Direito: Barra de Busca em Tempo Real */}
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                  <Input
                    placeholder="Buscar nº pedido, cliente, fone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-8.5 text-xs rounded-xl bg-neutral-50/60 border-neutral-200 focus:bg-white"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO DE COLUNA EM DISPOSITIVOS MÓVEIS (< lg) */}
          <div className="lg:hidden grid grid-cols-3 gap-1.5 p-1 bg-neutral-100/90 rounded-xl border border-neutral-200/80 text-xs">
            <button
              type="button"
              onClick={() => setMobileColumnTab('awaiting_confirmation')}
              className={`py-2 px-2 rounded-lg font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                mobileColumnTab === 'awaiting_confirmation'
                  ? 'bg-white text-amber-900 font-semibold shadow-xs border border-amber-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-amber-600 shrink-0" />
                <span>Aguardando</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-mono">
                {kanbanGroups.awaitingConfirmation.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileColumnTab('preparing')}
              className={`py-2 px-2 rounded-lg font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                mobileColumnTab === 'preparing'
                  ? 'bg-white text-sky-900 font-semibold shadow-xs border border-sky-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="flex items-center gap-1">
                <ChefHat className="size-3 text-sky-600 shrink-0" />
                <span>Preparando</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-900 font-mono">
                {kanbanGroups.preparing.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileColumnTab('ready')}
              className={`py-2 px-2 rounded-lg font-medium transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                mobileColumnTab === 'ready'
                  ? 'bg-white text-emerald-900 font-semibold shadow-xs border border-emerald-200/80'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-600 shrink-0" />
                <span>Pronto</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-mono">
                {kanbanGroups.ready.length}
              </span>
            </button>
          </div>

          {/* GRID KANBAN DE 3 COLUNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            {/* ======================================================= */}
            {/* COLUNA 1: 🟡 AGUARDANDO CONFIRMAÇÃO                     */}
            {/* ======================================================= */}
            <div
              className={`space-y-3.5 ${
                mobileColumnTab !== 'awaiting_confirmation' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Header da Coluna */}
              <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center border border-amber-300/80 shadow-2xs">
                    <Clock className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Aguardando Confirmação
                    </h3>
                    <p className="text-[11px] text-amber-800/90 font-medium">
                      Novos pedidos recebidos
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-200/90 text-amber-950 border border-amber-300">
                  {kanbanGroups.awaitingConfirmation.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna 1 */}
              {kanbanGroups.awaitingConfirmation.length === 0 ? (
                <div className="border border-dashed border-neutral-200 bg-neutral-50/50 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 className="size-6 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium">
                    Nenhum pedido aguardando confirmação.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {kanbanGroups.awaitingConfirmation.map((order) => {
                    const isDelivery =
                      (order.delivery_method || order.delivery_type) === 'delivery'
                    const isScheduled = !!order.scheduled_date
                    const compactSchedule = formatOrderScheduleCompact(
                      order.scheduled_date,
                      order.scheduled_time_slot,
                      todayStr
                    )
                    const address = order.delivery_address as CheckoutAddress | null
                    const customerMsg = formatCustomerWhatsAppMessage(
                      order,
                      store?.name,
                      storeTemplates.status_update
                    )
                    const whatsAppLink = formatWhatsAppLink(order.customer_phone, customerMsg)

                    return (
                      <div
                        key={order.id}
                        className="border border-amber-200/90 bg-white hover:border-amber-300 rounded-2xl shadow-xs overflow-hidden transition-all flex flex-col justify-between"
                      >
                        {/* Topo do Card */}
                        <div className="p-4 space-y-3 bg-amber-50/25 border-b border-amber-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200/80 mr-2">
                                #{order.order_number}
                              </span>
                              <span className="font-semibold text-sm text-neutral-900">
                                {order.customer_name}
                              </span>
                            </div>

                            {/* Badge de Urgência / Encomenda */}
                            {isScheduled ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200 shrink-0">
                                <Calendar className="size-2.5" />
                                {compactSchedule}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-900 border border-orange-200 shrink-0">
                                Pronta-Entrega
                              </span>
                            )}
                          </div>

                          {/* Linha de Horário / Decorrido e Modalidade */}
                          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="inline-flex items-center gap-1 font-medium text-neutral-600 text-[11px]">
                              <Clock className="size-3 text-neutral-400" />
                              <span>{formatElapsedTime(order.created_at, currentTime)}</span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {isDelivery ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-neutral-700 border border-neutral-200">
                                  <Truck className="size-3" />
                                  Delivery
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-neutral-700 border border-neutral-200">
                                  <StoreIcon className="size-3" />
                                  Retirada
                                </span>
                              )}

                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  order.payment_status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-100 text-amber-900 border-amber-200'
                                }`}
                              >
                                {order.payment_status === 'paid' ? 'Pago' : 'Aguardando PIX'}
                              </span>
                            </div>
                          </div>

                          {/* Endereço resumido se houver */}
                          {isDelivery && address && (
                            <div className="text-[11px] text-neutral-600 flex items-start gap-1.5 pt-0.5">
                              <MapPin className="size-3 text-neutral-400 shrink-0 mt-0.5" />
                              <span className="line-clamp-1">
                                {address.street}, {address.number} • {address.neighborhood}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Itens do Pedido */}
                        <div className="p-4 space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            Itens ({order.items.length})
                          </div>
                          <div className="space-y-1.5">
                            {order.items.map((item) => {
                              const cust = item.customizations as Record<string, unknown> | null
                              const choices = cust?.choices as Array<{ name: string; quantity: number }> | null

                              return (
                                <div key={item.id} className="text-xs space-y-0.5">
                                  <div className="flex items-center justify-between font-medium text-neutral-900">
                                    <span>
                                      {item.quantity}x {item.product_name}
                                    </span>
                                    <span className="font-mono text-neutral-500 text-[11px]">
                                      {formatCurrency(item.total_price)}
                                    </span>
                                  </div>
                                  {choices && choices.length > 0 && (
                                    <div className="text-[11px] text-neutral-500 pl-3">
                                      └ {choices.map((c) => `${c.quantity}x ${c.name}`).join(', ')}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {order.notes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                              📝 <span className="font-semibold">Obs:</span> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card com Ação de Aprovação */}
                        <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-500 font-medium">Total:</span>
                            <span className="text-sm font-bold font-mono text-neutral-900">
                              {formatCurrency(order.total)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Botão Primário: Aprovar & Iniciar Preparo */}
                            <Button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleApproveOrder(order)}
                              className="flex-1 h-9 text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <ChefHat className="size-3.5" />
                              <span>Aprovar & Preparar</span>
                            </Button>

                            {/* WhatsApp */}
                            <a
                              href={whatsAppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Avisar cliente no WhatsApp"
                              className="size-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shrink-0 transition-colors"
                            >
                              <MessageCircle className="size-4" />
                            </a>

                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(order)}
                              title="Ver Detalhes do Pedido"
                              className="size-9 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <Eye className="size-4" />
                            </button>

                            {/* Cancelar */}
                            <button
                              type="button"
                              onClick={() => handleCancelOrder(order)}
                              title="Cancelar Pedido"
                              className="size-9 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <Ban className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ======================================================= */}
            {/* COLUNA 2: 🔵 PREPARANDO                                 */}
            {/* ======================================================= */}
            <div
              className={`space-y-3.5 ${
                mobileColumnTab !== 'preparing' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Header da Coluna */}
              <div className="p-3.5 bg-sky-50/80 border border-sky-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-sky-100 text-sky-900 flex items-center justify-center border border-sky-300/80 shadow-2xs">
                    <ChefHat className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Preparando
                    </h3>
                    <p className="text-[11px] text-sky-800/90 font-medium">
                      Em montagem e embalagem
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-sky-200/90 text-sky-950 border border-sky-300">
                  {kanbanGroups.preparing.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna 2 */}
              {kanbanGroups.preparing.length === 0 ? (
                <div className="border border-dashed border-neutral-200 bg-neutral-50/50 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 className="size-6 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium">
                    Nenhum pedido em preparo no momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {kanbanGroups.preparing.map((order) => {
                    const isDelivery =
                      (order.delivery_method || order.delivery_type) === 'delivery'
                    const isScheduled = !!order.scheduled_date
                    const compactSchedule = formatOrderScheduleCompact(
                      order.scheduled_date,
                      order.scheduled_time_slot,
                      todayStr
                    )
                    const address = order.delivery_address as CheckoutAddress | null
                    const customerMsg = formatCustomerWhatsAppMessage(
                      order,
                      store?.name,
                      storeTemplates.status_update
                    )
                    const whatsAppLink = formatWhatsAppLink(order.customer_phone, customerMsg)

                    return (
                      <div
                        key={order.id}
                        className="border border-sky-200/90 bg-white hover:border-sky-300 rounded-2xl shadow-xs overflow-hidden transition-all flex flex-col justify-between"
                      >
                        {/* Topo do Card */}
                        <div className="p-4 space-y-3 bg-sky-50/25 border-b border-sky-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold bg-sky-100 text-sky-900 px-2 py-0.5 rounded-md border border-sky-200/80 mr-2">
                                #{order.order_number}
                              </span>
                              <span className="font-semibold text-sm text-neutral-900">
                                {order.customer_name}
                              </span>
                            </div>

                            {isDelivery ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-neutral-700 border border-neutral-200 shrink-0">
                                <Truck className="size-3" />
                                Delivery
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white text-neutral-700 border border-neutral-200 shrink-0">
                                <StoreIcon className="size-3" />
                                Retirada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="inline-flex items-center gap-1 font-medium text-neutral-600 text-[11px]">
                              <Clock className="size-3 text-neutral-400" />
                              <span>{compactSchedule}</span>
                            </div>

                            {address && isDelivery && (
                              <span className="text-[11px] text-neutral-500 truncate max-w-[180px]">
                                {address.neighborhood}, {address.city}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Checklist de Embalagem */}
                        <div className="p-4 space-y-2.5">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                            <span>Checklist de Embalagem</span>
                            <span className="text-[9px] font-normal lowercase">marque ao separar</span>
                          </div>

                          <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200/80 bg-neutral-50/40 p-2.5 space-y-2">
                            {order.items.map((item) => {
                              const cust = item.customizations as Record<string, unknown> | null
                              const choices = cust?.choices as Array<{ name: string; quantity: number }> | null
                              const isCombo = !!(choices && choices.length > 0)

                              if (isCombo && choices) {
                                return (
                                  <div key={item.id} className="pt-2 first:pt-0 space-y-1">
                                    <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                                      <span className="flex items-center gap-1">
                                        <Boxes className="size-3 text-neutral-500" />
                                        {item.quantity}x {item.product_name}
                                      </span>
                                    </div>
                                    <div className="pl-3 space-y-1 border-l-2 border-neutral-200 ml-1">
                                      {choices.map((choice, choiceIdx) => {
                                        const choiceKey = `${item.id}_choice_${choiceIdx}_${choice.name.replace(/\s+/g, '_')}`
                                        const isPacked = !!packedItemsMap[choiceKey]

                                        return (
                                          <label
                                            key={choiceKey}
                                            className="flex items-center gap-2 text-xs cursor-pointer select-none"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isPacked}
                                              onChange={() => togglePackedItem(choiceKey)}
                                              className="size-4 rounded border-neutral-300 text-neutral-900 accent-neutral-900 cursor-pointer"
                                            />
                                            <span
                                              className={`text-[11px] ${
                                                isPacked ? 'line-through text-neutral-400' : 'text-neutral-800'
                                              }`}
                                            >
                                              {choice.quantity}x {choice.name}
                                            </span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              const isPacked = !!packedItemsMap[item.id]
                              return (
                                <label
                                  key={item.id}
                                  className="pt-2 first:pt-0 flex items-center justify-between gap-2 text-xs cursor-pointer select-none"
                                >
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isPacked}
                                      onChange={() => togglePackedItem(item.id)}
                                      className="size-4 rounded border-neutral-300 text-neutral-900 accent-neutral-900 cursor-pointer"
                                    />
                                    <span
                                      className={`font-medium ${
                                        isPacked ? 'line-through text-neutral-400' : 'text-neutral-900'
                                      }`}
                                    >
                                      {item.quantity}x {item.product_name}
                                    </span>
                                  </div>
                                  <span className="font-mono text-neutral-400 text-[11px]">
                                    {formatCurrency(item.total_price)}
                                  </span>
                                </label>
                              )
                            })}
                          </div>

                          {order.notes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                              📝 <span className="font-semibold">Obs:</span> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Rodapé do Card com Botão de Marcar como Pronto */}
                        <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/50 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-500 font-medium">Total:</span>
                            <span className="text-sm font-bold font-mono text-neutral-900">
                              {formatCurrency(order.total)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Botão Primário: Marcar como Pronto */}
                            <Button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleMarkAsReady(order)}
                              className="flex-1 h-9 text-xs font-semibold bg-sky-700 hover:bg-sky-800 text-white rounded-xl shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <Sparkles className="size-3.5" />
                              <span>Marcar como Pronto</span>
                            </Button>

                            {/* WhatsApp */}
                            <a
                              href={whatsAppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Avisar cliente no WhatsApp"
                              className="size-9 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shrink-0 transition-colors"
                            >
                              <MessageCircle className="size-4" />
                            </a>

                            {/* Ver Detalhes */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetails(order)}
                              title="Ver Detalhes do Pedido"
                              className="size-9 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <Eye className="size-4" />
                            </button>

                            {/* Voltar para Aguardando */}
                            <button
                              type="button"
                              onClick={() => handleRevertToPending(order)}
                              title="Voltar para Aguardando Confirmação"
                              className="size-9 rounded-xl bg-white hover:bg-neutral-100 text-neutral-500 border border-neutral-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ======================================================= */}
            {/* COLUNA 3: 🟢 PRONTO                                     */}
            {/* ======================================================= */}
            <div
              className={`space-y-3.5 ${
                mobileColumnTab !== 'ready' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* Header da Coluna */}
              <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center border border-emerald-300/80 shadow-2xs">
                    <Sparkles className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Pronto
                    </h3>
                    <p className="text-[11px] text-emerald-800/90 font-medium">
                      Pronto para retirada ou envio
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-200/90 text-emerald-950 border border-emerald-300">
                  {kanbanGroups.ready.length}
                </span>
              </div>

              {/* Lista de Cards da Coluna 3 */}
              {kanbanGroups.ready.length === 0 ? (
                <div className="border border-dashed border-neutral-200 bg-neutral-50/50 rounded-2xl p-8 text-center space-y-2">
                  <CheckCircle2 className="size-6 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium">
                    Nenhum pedido pronto aguardando despacho.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {kanbanGroups.ready.map((order) => {
                    const isDelivery =
                      (order.delivery_method || order.delivery_type) === 'delivery'
                    const compactSchedule = formatOrderScheduleCompact(
                      order.scheduled_date,
                      order.scheduled_time_slot,
                      todayStr
                    )
                    const address = order.delivery_address as CheckoutAddress | null
                    const readyMsg = formatProductionReadyWhatsAppMessage(
                      order,
                      store?.name,
                      getStorePickupAddress(store),
                      storeTemplates
                    )
                    const whatsAppLink = formatWhatsAppLink(order.customer_phone, readyMsg)

                    return (
                      <div
                        key={order.id}
                        className="border-2 border-emerald-300/90 bg-white hover:border-emerald-400 rounded-2xl shadow-xs overflow-hidden transition-all flex flex-col justify-between"
                      >
                        {/* Topo do Card */}
                        <div className="p-4 space-y-3 bg-emerald-50/30 border-b border-emerald-100">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-md border border-emerald-200/80 mr-2">
                                #{order.order_number}
                              </span>
                              <span className="font-semibold text-sm text-neutral-900">
                                {order.customer_name}
                              </span>
                            </div>

                            {isDelivery ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                                <Truck className="size-3" />
                                🚚 Pronto p/ Envio
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200 shrink-0">
                                <StoreIcon className="size-3" />
                                🏪 Pronto p/ Retirada
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                            <div className="inline-flex items-center gap-1 font-medium text-neutral-600 text-[11px]">
                              <Clock className="size-3 text-neutral-400" />
                              <span>{compactSchedule}</span>
                            </div>

                            <span suppressHydrationWarning className="text-[11px] text-neutral-500 font-mono">
                              {order.customer_phone}
                            </span>
                          </div>

                          {/* Endereço de Entrega */}
                          {isDelivery && address && (
                            <div className="text-[11px] text-neutral-700 bg-white/80 p-2 rounded-lg border border-neutral-200/70 flex items-start gap-1.5">
                              <MapPin className="size-3 text-emerald-600 shrink-0 mt-0.5" />
                              <span>
                                {address.street}, {address.number}
                                {address.complement ? ` - ${address.complement}` : ''} •{' '}
                                {address.neighborhood} ({address.city})
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Resumo de Itens */}
                        <div className="p-4 space-y-2">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                            Itens Prontos ({order.items.length})
                          </div>
                          <div className="space-y-1 text-xs">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between font-medium text-neutral-800"
                              >
                                <span>
                                  {item.quantity}x {item.product_name}
                                </span>
                                <span className="font-mono text-neutral-400 text-[11px]">
                                  {formatCurrency(item.total_price)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                              📝 <span className="font-semibold">Obs:</span> {order.notes}
                            </div>
                          )}
                        </div>

                        {/* AÇÃO PRINCIPAL EM DESTAQUE: DESPACHAR & AVISAR WHATSAPP */}
                        <div className="p-3.5 border-t border-emerald-100 bg-emerald-50/20 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-neutral-500 font-medium">Total:</span>
                            <span className="text-sm font-bold font-mono text-neutral-900">
                              {formatCurrency(order.total)}
                            </span>
                          </div>

                          {/* Linha 1: BOTÃO DESPACHAR EM DESTAQUE (Move para delivered) */}
                          <Button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDispatchOrder(order)}
                            className="w-full h-10 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                          >
                            <Send className="size-4" />
                            <span>Despachar Pedido</span>
                          </Button>

                          {/* Linha 2: Ações Auxiliares (Avisar WhatsApp, Detalhes, Voltar) */}
                          <div className="flex items-center gap-2">
                            <a
                              href={whatsAppLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 h-8.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                            >
                              <MessageCircle className="size-3.5 text-emerald-600" />
                              <span>Avisar no WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => handleOpenDetails(order)}
                              title="Ver Detalhes do Pedido"
                              className="size-8.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <Eye className="size-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRevertToPreparing(order)}
                              title="Voltar para Preparando"
                              className="size-8.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-500 border border-neutral-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SEÇÃO RETRÁTIL: 📦 HISTÓRICO DE PEDIDOS FINALIZADOS          */}
          {/* ============================================================ */}
          <div className="border border-neutral-200/80 rounded-2xl shadow-xs bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setIsHistoryOpen((prev) => !prev)}
              className="w-full p-4 bg-neutral-50/70 hover:bg-neutral-100/70 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-neutral-200 text-neutral-700 flex items-center justify-center">
                  <History className="size-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    Histórico de Pedidos Finalizados ({historyCounts.delivered}) & Cancelados ({historyCounts.cancelled})
                  </h4>
                  <p className="text-[11px] text-neutral-500">
                    Clique para {isHistoryOpen ? 'recolher' : 'visualizar'} o histórico paginado sob demanda
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-neutral-700">
                  {historyCounts.total} pedidos
                </span>
                {isHistoryOpen ? (
                  <ChevronUp className="size-4 text-neutral-500" />
                ) : (
                  <ChevronDown className="size-4 text-neutral-500" />
                )}
              </div>
            </button>

            {isHistoryOpen && (
              <div className="p-4 border-t border-neutral-200/80 space-y-4 animate-in fade-in-50">
                {/* Barra de Filtros e Busca do Histórico */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Tabs de Status */}
                  <div className="flex items-center gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/80 self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStatusFilter('all')
                        setHistoryPage(1)
                      }}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                        historyStatusFilter === 'all'
                          ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Todos ({historyCounts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStatusFilter('delivered')
                        setHistoryPage(1)
                      }}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                        historyStatusFilter === 'delivered'
                          ? 'bg-white text-emerald-900 shadow-2xs font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Entregues ({historyCounts.delivered})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStatusFilter('cancelled')
                        setHistoryPage(1)
                      }}
                      className={`text-xs font-medium px-3 py-1 rounded-lg transition-colors ${
                        historyStatusFilter === 'cancelled'
                          ? 'bg-white text-rose-900 shadow-2xs font-semibold'
                          : 'text-neutral-600 hover:text-neutral-900'
                      }`}
                    >
                      Cancelados ({historyCounts.cancelled})
                    </button>
                  </div>

                  {/* Busca no histórico */}
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400" />
                    <Input
                      placeholder="Buscar no histórico (nº, nome, fone)..."
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value)
                        setHistoryPage(1)
                      }}
                      className="pl-9 pr-8 h-8.5 text-xs rounded-xl bg-neutral-50/60 border-neutral-200 focus:bg-white"
                    />
                    {isLoadingHistory ? (
                      <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-neutral-400 animate-spin" />
                    ) : historySearch ? (
                      <button
                        type="button"
                        onClick={() => {
                          setHistorySearch('')
                          setHistoryPage(1)
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Lista de Registros ou Loading */}
                {isLoadingHistory && historyOrders.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                    <Loader2 className="size-6 animate-spin text-neutral-500" />
                    <span className="text-xs">Carregando pedidos do histórico...</span>
                  </div>
                ) : historyOrders.length === 0 ? (
                  <div className="border border-dashed border-neutral-200 bg-neutral-50/50 rounded-xl py-8 text-center space-y-1">
                    <History className="size-5 text-neutral-300 mx-auto" />
                    <p className="text-xs text-neutral-500 font-medium">
                      Nenhum pedido encontrado no histórico com os filtros aplicados.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 overflow-hidden bg-white">
                    {historyOrders.map((order) => {
                      const isCancelled = order.status === 'cancelled'

                      return (
                        <div
                          key={order.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-neutral-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold bg-neutral-100 text-neutral-700 px-2 py-1 rounded border border-neutral-200">
                              #{order.order_number}
                            </span>
                            <div>
                              <div className="font-semibold text-xs text-neutral-900">
                                {order.customer_name}
                              </div>
                              <div suppressHydrationWarning className="text-[11px] text-neutral-500">
                                {order.items.length} itens • {new Date(order.created_at).toLocaleDateString('pt-BR')} • {order.customer_phone}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                isCancelled
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {isCancelled ? 'Cancelado' : 'Entregue / Despachado'}
                            </span>

                            <span className="font-mono text-xs font-bold text-neutral-900">
                              {formatCurrency(order.total)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleOpenDetails(order)}
                              className="text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-white hover:bg-neutral-50 px-2.5 py-1 rounded-lg transition-colors"
                            >
                              Detalhes
                            </button>

                            {isCancelled && (
                              <button
                                type="button"
                                onClick={() => handleReopenOrder(order)}
                                className="text-xs text-sky-700 hover:text-sky-900 border border-sky-200 bg-sky-50 hover:bg-sky-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Reabrir
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Barra Inferior de Paginação */}
                {historyTotalCount > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-neutral-600 border-t border-neutral-100">
                    <div className="text-[11px] text-neutral-500">
                      Mostrando{' '}
                      <span className="font-semibold text-neutral-800">
                        {(historyPage - 1) * historyPageSize + 1}
                      </span>{' '}
                      a{' '}
                      <span className="font-semibold text-neutral-800">
                        {Math.min(historyPage * historyPageSize, historyTotalCount)}
                      </span>{' '}
                      de{' '}
                      <span className="font-semibold text-neutral-800">
                        {historyTotalCount}
                      </span>{' '}
                      pedidos
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={historyPage <= 1 || isLoadingHistory}
                        onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                        className="h-8 text-xs rounded-lg px-2.5 flex items-center gap-1 border-neutral-200"
                      >
                        <ChevronLeft className="size-3.5" />
                        <span>Anterior</span>
                      </Button>

                      <span className="text-xs font-medium px-2">
                        Página {historyPage} de {Math.max(1, historyTotalPages)}
                      </span>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={historyPage >= historyTotalPages || isLoadingHistory}
                        onClick={() =>
                          setHistoryPage((prev) => Math.min(historyTotalPages, prev + 1))
                        }
                        className="h-8 text-xs rounded-lg px-2.5 flex items-center gap-1 border-neutral-200"
                      >
                        <span>Próxima</span>
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES COMPLETOS DO PEDIDO */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-white border-neutral-200">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-base font-semibold text-neutral-900">
                    Pedido #{selectedOrder.order_number}
                  </DialogTitle>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      ORDER_STATUS_BADGE_VARIANTS[selectedOrder.status as OrderStatus]?.bg || 'bg-neutral-100'
                    } ${
                      ORDER_STATUS_BADGE_VARIANTS[selectedOrder.status as OrderStatus]?.text || 'text-neutral-800'
                    } ${
                      ORDER_STATUS_BADGE_VARIANTS[selectedOrder.status as OrderStatus]?.border || 'border-neutral-200'
                    }`}
                  >
                    {ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus]}
                  </span>
                </div>
                <DialogDescription className="text-xs text-neutral-500">
                  {selectedOrder.scheduled_date
                    ? `Agendado para ${selectedOrder.scheduled_date} ${
                        selectedOrder.scheduled_time_slot
                          ? `(${selectedOrder.scheduled_time_slot})`
                          : ''
                      }`
                    : `Realizado em ${new Date(
                        selectedOrder.created_at
                      ).toLocaleString('pt-BR')}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Dados do Cliente */}
                <div className="p-3.5 rounded-xl bg-neutral-50/60 border border-neutral-200/80 space-y-1.5 text-xs">
                  <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                    <User className="size-3.5 text-neutral-700" />
                    {selectedOrder.customer_name}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Phone className="size-3" />
                    <span suppressHydrationWarning>{selectedOrder.customer_phone}</span>
                  </div>

                  {selectedOrder.delivery_address && (
                    <div className="pt-1 text-neutral-600 flex items-start gap-1.5 border-t border-neutral-200/80 mt-1.5">
                      <MapPin className="size-3.5 text-neutral-500 shrink-0 mt-0.5" />
                      <span>
                        {(selectedOrder.delivery_address as CheckoutAddress).street},{' '}
                        {(selectedOrder.delivery_address as CheckoutAddress).number} •{' '}
                        {(selectedOrder.delivery_address as CheckoutAddress).neighborhood},{' '}
                        {(selectedOrder.delivery_address as CheckoutAddress).city}
                      </span>
                    </div>
                  )}
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-2">
                  <h4 className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                    Itens ({selectedOrder.items.length})
                  </h4>
                  <div className="divide-y divide-neutral-200/80 rounded-xl border border-neutral-200/80 bg-white p-3 space-y-2.5">
                    {selectedOrder.items.map((item) => {
                      const cust = item.customizations as Record<
                        string,
                        unknown
                      > | null
                      const choices = cust?.choices as Array<{
                        name: string
                        quantity: number
                      }> | null
                      const isCombo = !!(choices && choices.length > 0)

                      if (isCombo && choices) {
                        return (
                          <div key={item.id} className="pt-2.5 first:pt-0 space-y-1.5 text-xs">
                            <div className="flex justify-between items-center bg-neutral-100/90 px-2.5 py-1.5 rounded-lg border border-neutral-200/80 font-bold text-neutral-900">
                              <div className="flex items-center gap-1.5">
                                <Boxes className="size-3.5 text-neutral-600 shrink-0" />
                                <span>{item.quantity}x {item.product_name}</span>
                              </div>
                              <span className="font-mono tabular-nums text-neutral-700">
                                {formatCurrency(item.total_price)}
                              </span>
                            </div>

                            <div className="pl-3 space-y-1 border-l-2 border-neutral-200/90 ml-1.5">
                              {choices.map((choice, choiceIdx) => (
                                <div
                                  key={choiceIdx}
                                  className="flex justify-between font-semibold text-neutral-800 text-xs py-0.5"
                                >
                                  <span>• {choice.quantity}x {choice.name}</span>
                                </div>
                              ))}
                              {item.notes && (
                                <div className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                                  Obs: {item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      }

                      return (
                        <div key={item.id} className="pt-2 first:pt-0 text-xs">
                          <div className="flex justify-between font-medium text-neutral-900">
                            <span>
                              {item.quantity}x {item.product_name}
                            </span>
                            <span className="font-semibold font-mono tabular-nums">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                          {item.notes && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1">
                              Obs: {item.notes}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center p-3.5 rounded-xl bg-neutral-100 border border-neutral-200 text-sm font-semibold text-neutral-900">
                  <span>Valor Total:</span>
                  <span className="text-base font-semibold font-mono tabular-nums">
                    {formatCurrency(selectedOrder.total)}
                  </span>
                </div>

                {/* Ações de Status Comercial */}
                <div className="space-y-2 pt-2 border-t border-neutral-200/80">
                  <span className="text-xs font-medium text-neutral-500 block">
                    Atualizar Status Comercial:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="xs"
                      variant={
                        selectedOrder.status === 'confirmed'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        handleUpdateOrderStatus(selectedOrder.id, 'confirmed')
                      }
                    >
                      Confirmar Pagamento
                    </Button>
                    <Button
                      size="xs"
                      variant={
                        selectedOrder.status === 'out_for_delivery'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        handleUpdateOrderStatus(
                          selectedOrder.id,
                          'out_for_delivery'
                        )
                      }
                    >
                      Saiu p/ Entrega
                    </Button>
                    <Button
                      size="xs"
                      variant={
                        selectedOrder.status === 'delivered'
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() =>
                        handleUpdateOrderStatus(selectedOrder.id, 'delivered')
                      }
                    >
                      Entregue / Concluído
                    </Button>
                    <Button
                      size="xs"
                      variant={
                        selectedOrder.status === 'cancelled'
                          ? 'destructive'
                          : 'outline'
                      }
                      onClick={() =>
                        handleUpdateOrderStatus(selectedOrder.id, 'cancelled')
                      }
                    >
                      Cancelar Pedido
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailOpen(false)}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

