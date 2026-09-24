'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  formatCurrency,
  formatCustomerWhatsAppMessage,
  formatWhatsAppLink,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_VARIANTS,
  DELIVERY_TYPE_LABELS,
  type OrderWithItems,
  type OrderStatus,
  type DashboardMetrics,
} from '@/lib/domain/orders'
import {
  calculateDropStockSummary,
  formatDropStatus,
  type DropWithItems,
} from '@/lib/domain/drops'
import { type Store, getStoreWhatsAppTemplates } from '@/lib/domain/stores'
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Flame,
  ShoppingBag,
  ArrowRight,
  ExternalLink,
  Package,
  Sparkles,
  Calendar,
  AlertCircle,
  MessageCircle,
  Plus,
  Truck,
  Phone,
  Store as StoreIcon,
  Boxes,
  FolderTree,
} from 'lucide-react'
import { AiChat } from '@/components/ai-chat'

interface DashboardClientProps {
  store: Store | null
  activeDrop: DropWithItems | null
  recentOrders: OrderWithItems[]
  totalOrdersCount: number
  metrics: {
    storeMetrics: DashboardMetrics
    activeDropMetrics: DashboardMetrics | null
  }
}

export function DashboardClient({
  store,
  activeDrop,
  recentOrders,
  totalOrdersCount,
  metrics,
}: DashboardClientProps) {
  const { storeMetrics, activeDropMetrics } = metrics
  const displayMetrics = activeDropMetrics ?? storeMetrics

  const storeTemplates = React.useMemo(
    () => getStoreWhatsAppTemplates(store),
    [store]
  )

  // Cronômetro para o Drop Ativo
  const [timeLeft, setTimeLeft] = useState<{
    hours: number
    minutes: number
    seconds: number
    progressPercent: number
    isEnded: boolean
  }>({ hours: 0, minutes: 0, seconds: 0, progressPercent: 0, isEnded: false })

  useEffect(() => {
    if (!activeDrop || !activeDrop.ends_at) return

    const calculateTime = () => {
      const now = new Date().getTime()
      const end = new Date(activeDrop.ends_at!).getTime()
      const start = activeDrop.starts_at
        ? new Date(activeDrop.starts_at).getTime()
        : end - 24 * 60 * 60 * 1000

      const difference = end - now

      if (difference <= 0) {
        setTimeLeft({
          hours: 0,
          minutes: 0,
          seconds: 0,
          progressPercent: 100,
          isEnded: true,
        })
        return
      }

      const totalDuration = end - start
      const elapsed = now - start
      const progressPercent = Math.min(
        100,
        Math.max(0, Math.round((elapsed / totalDuration) * 100))
      )

      const hours = Math.floor(difference / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({
        hours,
        minutes,
        seconds,
        progressPercent,
        isEnded: false,
      })
    }

    calculateTime()
    const interval = setInterval(calculateTime, 1000)
    return () => clearInterval(interval)
  }, [activeDrop])

  const dropStock = activeDrop
    ? calculateDropStockSummary(activeDrop.items)
    : null

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-8">
      {/* 0. Card de Onboarding se a Loja ainda não foi criada */}
      {!store && (
        <div className="border border-neutral-200/80 bg-white p-6 rounded-xl shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
                <StoreIcon className="size-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-neutral-900">
                  Você ainda não criou sua loja
                </h2>
                <p className="text-xs text-neutral-500 max-w-lg">
                  Configure o nome, WhatsApp e dados da sua marca para começar a lançar pré-vendas e receber pedidos diretamente no WhatsApp com PIX.
                </p>
              </div>
            </div>
            <Link href="/admin/settings" className="shrink-0 w-full sm:w-auto">
              <Button className="w-full sm:w-auto font-medium gap-2 bg-neutral-900 hover:bg-neutral-800 text-white shadow-xs">
                <Plus className="size-4" />
                Criar Minha Loja
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 1. Cards de Métricas Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Total */}
        <div className="p-5 space-y-3 bg-white rounded-xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              {activeDrop ? 'Faturamento da Pré-venda' : 'Faturamento Total'}
            </span>
            <div className="size-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="size-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {formatCurrency(displayMetrics.totalRevenue)}
            </div>
            <p className="text-[11px] text-neutral-500">
              {activeDrop
                ? 'Em pedidos confirmados/pagos desta pré-venda'
                : 'Total acumulado em pedidos confirmados'}
            </p>
          </div>
        </div>

        {/* Pedidos Pendentes */}
        <div className="p-5 space-y-3 bg-white rounded-xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Pedidos Pendentes
            </span>
            <div className="size-9 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
              <Clock className="size-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-amber-800 tabular-nums">
              {displayMetrics.pendingOrdersCount}
            </div>
            <p className="text-[11px] text-neutral-500">
              Aguardando confirmação de pagamento
            </p>
          </div>
        </div>

        {/* Pedidos Pagos / Confirmados */}
        <div className="p-5 space-y-3 bg-white rounded-xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Pedidos Pagos
            </span>
            <div className="size-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <CheckCircle2 className="size-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-emerald-800 tabular-nums">
              {displayMetrics.paidOrdersCount}
            </div>
            <p className="text-[11px] text-neutral-500">
              Pedidos prontos ou entregues
            </p>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="p-5 space-y-3 bg-white rounded-xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="size-9 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center">
              <TrendingUp className="size-4.5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-semibold tracking-tight text-neutral-900 tabular-nums">
              {formatCurrency(displayMetrics.averageTicket)}
            </div>
            <p className="text-[11px] text-neutral-500">
              Valor médio por pedido pago
            </p>
          </div>
        </div>
      </div>

      {/* 2. Resumo da Pré-venda Ativa com Progresso e Estoque */}
      {activeDrop ? (
        <div className="overflow-hidden border border-neutral-200/80 rounded-xl shadow-xs bg-white">
          <div className="bg-neutral-50/70 border-b border-neutral-200/80 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
                  <Flame className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-neutral-900">
                      {activeDrop.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      AO VIVO
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Pré-venda ativa atualmente na vitrine da loja
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {store && (
                  <Link
                    href={`/${store.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg transition-colors border border-neutral-200"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver Vitrine
                  </Link>
                )}
                <Link
                  href="/admin/drops"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200"
                >
                  Gerenciar Pré-vendas
                </Link>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cronômetro e Progresso de Tempo */}
              <div className="space-y-3 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/70">
                <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                  <span className="flex items-center gap-1.5 text-neutral-800 font-medium">
                    <Clock className="size-3.5 text-neutral-600" />
                    Tempo Restante da Pré-venda
                  </span>
                  <span className="font-mono text-neutral-900 font-semibold tabular-nums">
                    {timeLeft.isEnded
                      ? 'Encerrada'
                      : `${String(timeLeft.hours).padStart(2, '0')}h ${String(
                          timeLeft.minutes
                        ).padStart(2, '0')}m ${String(timeLeft.seconds).padStart(
                          2,
                          '0'
                        )}s`}
                  </span>
                </div>

                {/* Barra de Progresso Temporal (Sólida - Sem Gradiente) */}
                <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                  <div
                    className="bg-neutral-900 h-full transition-all duration-500"
                    style={{ width: `${timeLeft.progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-neutral-500">
                  <span>
                    Início: {activeDrop.starts_at ? formatDate(activeDrop.starts_at) : 'Imediato'}
                  </span>
                  <span>
                    Fim: {activeDrop.ends_at ? formatDate(activeDrop.ends_at) : 'Indefinido'}
                  </span>
                </div>
              </div>

              {/* Progresso de Estoque Alocado */}
              {dropStock && (
                <div className="space-y-3 p-4 rounded-xl bg-neutral-50/60 border border-neutral-200/70">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-500">
                    <span className="flex items-center gap-1.5 text-neutral-800 font-medium">
                      <Package className="size-3.5 text-neutral-600" />
                      Vendas de Estoque
                    </span>
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {dropStock.percentSold}% vendido
                    </span>
                  </div>

                  {/* Barra de Progresso do Estoque (Sólida) */}
                  <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                    <div
                      className="bg-neutral-900 h-full transition-all duration-500"
                      style={{ width: `${dropStock.percentSold}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span className="tabular-nums">
                      {dropStock.totalSold} de {dropStock.totalAllocated} itens vendidos
                    </span>
                    <span className="font-medium text-neutral-800 tabular-nums">
                      {dropStock.totalRemaining} unidades restantes
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Aviso quando não há pré-venda ativa */
        <div className="p-6 border border-dashed border-neutral-300 bg-white rounded-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="size-12 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center shrink-0">
                <Flame className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-neutral-900">
                  Nenhuma Pré-venda ativa no momento
                </h3>
                <p className="text-xs text-neutral-500">
                  Crie um novo evento de pré-venda gastronômica para ativar contagem
                  regressiva e estoque exclusivo.
                </p>
              </div>
            </div>

            <Link
              href="/admin/drops"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shrink-0"
            >
              <Plus className="size-3.5" />
              Criar ou Ativar Pré-venda
            </Link>
          </div>
        </div>
      )}

      {/* Assistente de IA (Full Width) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-neutral-900 flex items-center gap-2">
              <Sparkles className="size-4.5 text-indigo-500" />
              Assistente Virtual
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Tire dúvidas e faça consultas sobre a sua loja
            </p>
          </div>
        </div>
        <AiChat />
      </div>

      {/* 3. Tabela Rápida: Últimos 5 Pedidos Recebidos */}
      <div className="space-y-4">
          <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-neutral-900 flex items-center gap-2">
              <ShoppingBag className="size-4.5 text-neutral-800" />
              Últimos Pedidos Recebidos
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Acompanhamento em tempo real das compras mais recentes
            </p>
          </div>

          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
          >
            Ver todos ({totalOrdersCount})
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500">
                <ShoppingBag className="size-5" />
              </div>
              <h4 className="font-medium text-sm text-neutral-900">
                Nenhum pedido recebido ainda
              </h4>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Assim que os compradores realizarem pedidos pela vitrine, eles
                aparecerão aqui instantaneamente.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-200/80 hover:bg-transparent">
                  <TableHead className="w-20 text-neutral-500 text-xs font-medium">Pedido</TableHead>
                  <TableHead className="text-neutral-500 text-xs font-medium">Data</TableHead>
                  <TableHead className="text-neutral-500 text-xs font-medium">Cliente</TableHead>
                  <TableHead className="text-neutral-500 text-xs font-medium">Entrega</TableHead>
                  <TableHead className="text-neutral-500 text-xs font-medium">Total</TableHead>
                  <TableHead className="text-neutral-500 text-xs font-medium">Status</TableHead>
                  <TableHead className="text-right text-neutral-500 text-xs font-medium">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => {
                  const statusInfo =
                    ORDER_STATUS_BADGE_VARIANTS[order.status as OrderStatus] ||
                    ORDER_STATUS_BADGE_VARIANTS.pending
                  const statusLabel =
                    ORDER_STATUS_LABELS[order.status as OrderStatus] ||
                    order.status
                  const whatsAppLink = formatWhatsAppLink(
                    order.customer_phone,
                    formatCustomerWhatsAppMessage(
                      order,
                      store?.name ?? 'AppDrops',
                      storeTemplates.status_update
                    )
                  )

                  return (
                    <TableRow key={order.id} className="border-neutral-200/80 hover:bg-neutral-50/80">
                      <TableCell className="font-semibold text-neutral-900">
                        <span className="font-mono text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded border border-neutral-200">
                          #{order.order_number}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500 whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-neutral-900 text-sm">
                          {order.customer_name}
                        </div>
                        <div
                          suppressHydrationWarning
                          className="text-[11px] text-neutral-500 flex items-center gap-1"
                        >
                          <Phone className="size-3" />
                          <span suppressHydrationWarning>{order.customer_phone}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-600">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700">
                          {order.delivery_type === 'delivery' ? (
                            <>
                              <Truck className="size-3" />
                              🚚 Entrega
                            </>
                          ) : (
                            <>
                              <ShoppingBag className="size-3" />
                              🏪 Retirada
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="font-semibold text-neutral-900 text-sm tabular-nums">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          {statusLabel}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={whatsAppLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center size-8 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
                            title="Falar no WhatsApp"
                          >
                            <MessageCircle className="size-3.5" />
                          </a>
                          <Link
                            href="/admin/orders"
                            className="inline-flex items-center justify-center size-8 rounded-lg bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 transition-colors"
                            title="Ver Pedidos"
                          >
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* 4. Atalhos Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <Link
          href="/admin/drops"
          className="p-4 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 shadow-xs transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Flame className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900">
                Lançar Pré-venda
              </div>
              <div className="text-xs text-neutral-500">
                Definir evento com timer
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/products?tab=products"
          className="p-4 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 shadow-xs transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Package className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900">
                Produtos
              </div>
              <div className="text-xs text-neutral-500">
                Pronta-entrega e encomendas
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/products?tab=combos"
          className="p-4 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 shadow-xs transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Boxes className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900">
                Combos & Caixas
              </div>
              <div className="text-xs text-neutral-500">
                Kits com regras de escolha
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/admin/products?tab=categories"
          className="p-4 rounded-xl border border-neutral-200/80 bg-white hover:border-neutral-300 shadow-xs transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <FolderTree className="size-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-neutral-900">
                Categorias
              </div>
              <div className="text-xs text-neutral-500">
                Organizar catálogo
              </div>
            </div>
          </div>
          <ArrowRight className="size-4 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>
    </div>
  )
}
