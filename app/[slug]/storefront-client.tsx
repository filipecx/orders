'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  isStoreOpen,
  type Store,
  getStorePickupAddress,
  formatStorePickupAddressCompact,
  formatStorePickupAddressFull,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_SHORT_LABELS,
  DAYS_OF_WEEK,
  businessHoursSchema,
  type BusinessHours,
  type DaySchedule,
  getStoreTheme,
  APPROVED_GOOGLE_FONTS,
  getFontWeightStyles,
  getContrastTextColor,
} from '@/lib/domain/stores'
import type { DropWithItems } from '@/lib/domain/drops'
import type { ProductWithCategory } from '@/lib/domain/products'
import type { Category } from '@/lib/domain/categories'
import type { ComboWithRules } from '@/lib/domain/combos'
import type { Faq } from '@/lib/domain/faqs'
import {
  formatCurrency,
  getProductPriceForModality,
  isProductAvailableInModality,
} from '@/lib/domain/products'
import { getStorefrontSectionsOrder } from '@/lib/domain/storefront-organization'
import { ProductCard } from '@/components/store/product-card'
import {
  Flame,
  Clock,
  ShoppingBag,
  Plus,
  Minus,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Zap,
  Calendar,
  FolderTree,
  Boxes,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Lock,
  Trash2,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Navigation,
} from 'lucide-react'

interface StorefrontClientProps {
  store: Store
  activeDrop: DropWithItems | null
  activeDrops?: DropWithItems[]
  catalogProducts: ProductWithCategory[]
  categories?: Category[]
  combos?: ComboWithRules[]
  faqs?: Faq[]
}

export type CartItemChoice = {
  productId: string
  name: string
  quantity: number
  categoryId?: string
}

export type CartItem = {
  id: string
  type: 'product' | 'combo'
  productId?: string | null
  comboId?: string | null
  dropItemId?: string | null
  productName: string
  productImageUrl?: string | null
  unitPrice: number
  quantity: number
  maxQuantity?: number
  saleType: 'ready_delivery' | 'order'
  leadTimeDays?: number
  customizations?: {
    combo_id?: string
    combo_name?: string
    choices: CartItemChoice[]
  } | null
}

type StoreTab = 'ready_delivery' | 'order'

export function StorefrontClient({
  store,
  activeDrop,
  activeDrops,
  catalogProducts,
  categories = [],
  combos = [],
  faqs = [],
}: StorefrontClientProps) {
  const router = useRouter()
  const theme = useMemo(() => getStoreTheme(store), [store])
  const primaryColor = theme.primary_color

  const selectedFont = useMemo(() => {
    return (
      APPROVED_GOOGLE_FONTS.find((f) => f.id === theme.font_family) ||
      APPROVED_GOOGLE_FONTS[0]
    )
  }, [theme.font_family])

  const fontWeights = useMemo(() => {
    return getFontWeightStyles(theme.font_weight)
  }, [theme.font_weight])

  const primaryContrastText = useMemo(() => {
    return getContrastTextColor(theme.primary_color)
  }, [theme.primary_color])

  const secondaryContrastText = useMemo(() => {
    return getContrastTextColor(theme.secondary_color)
  }, [theme.secondary_color])

  // Ordem personalizada das seções principais da vitrine
  const sectionsOrder = useMemo(
    () =>
      getStorefrontSectionsOrder(
        store.settings as Record<string, unknown> | null
      ),
    [store.settings]
  )

  // Lista de todas as pré-vendas ativas
  const dropsList: DropWithItems[] =
    activeDrops && activeDrops.length > 0
      ? activeDrops
      : activeDrop
      ? [activeDrop]
      : []

  // Estado do Carrinho (armazenado em memória e sincronizado com sessionStorage)
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)

  // Estado da Aba Ativa: 'ready_delivery' ou 'order'
  const [activeTab, setActiveTab] = useState<StoreTab>('ready_delivery')

  // Estado do Modal de Detalhes do Produto Simples
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProductWithCategory | null>(null)
  const [modalProductQuantity, setModalProductQuantity] = useState<number>(1)

  // Estado do Modal de Montagem de Combo
  const [selectedCombo, setSelectedCombo] = useState<ComboWithRules | null>(null)
  const [comboChoices, setComboChoices] = useState<Record<string, number>>({})

  // Estado do Modal Explicativo de Loja Fechada para Pronta-Entrega
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false)

  // Endereço de Retirada da Loja
  const pickupAddress = useMemo(() => getStorePickupAddress(store), [store])
  const compactPickupAddress = useMemo(
    () => formatStorePickupAddressCompact(pickupAddress),
    [pickupAddress]
  )
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false)
  const [isAddressCopied, setIsAddressCopied] = useState(false)

  const handleCopyAddress = async (textToCopy: string) => {
    if (!textToCopy) return
    try {
      await navigator.clipboard.writeText(textToCopy)
      setIsAddressCopied(true)
      setTimeout(() => setIsAddressCopied(false), 3000)
    } catch {
      // Fallback silencioso
    }
  }

  // Estado das FAQs abertas/fechadas
  const [openFaqs, setOpenFaqs] = useState<Record<number, boolean>>({})

  // Ticker global para atualizar cronômetros e horário a cada segundo
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Cálculo do Status de Horário de Funcionamento em tempo real
  const openStatus = useMemo(() => {
    return isStoreOpen(store, new Date(currentTime))
  }, [store, currentTime])

  const isStoreCurrentlyOpen = openStatus.isOpen
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false)
  const parsedBusinessHours = useMemo(() => {
    const res = businessHoursSchema.safeParse(store.business_hours)
    return res.success ? res.data : null
  }, [store.business_hours])
  const currentDayIndex = useMemo(() => new Date(currentTime).getDay(), [currentTime])

  // Carregar carrinho prévio do sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`cart_${store.id}`)
      if (saved) {
        setCart(JSON.parse(saved))
      }
    } catch {
      // Ignora erro no SSR
    }
  }, [store.id])

  // Salvar no sessionStorage quando atualizar
  useEffect(() => {
    try {
      sessionStorage.setItem(`cart_${store.id}`, JSON.stringify(cart))
    } catch {
      // Ignora
    }
  }, [cart, store.id])

  // Filtros por Tipo de Venda (Aba)
  const productsInTab = useMemo(() => {
    return catalogProducts.filter((p) => isProductAvailableInModality(p, activeTab))
  }, [catalogProducts, activeTab])

  const combosInTab = useMemo(() => {
    return combos.filter((c) => (c.sale_type || 'order') === activeTab)
  }, [combos, activeTab])

  // Contagem para badges das abas
  const readyDeliveryCount = useMemo(() => {
    const pCount = catalogProducts.filter((p) => isProductAvailableInModality(p, 'ready_delivery')).length
    const cCount = combos.filter((c) => (c.sale_type || 'order') === 'ready_delivery').length
    return pCount + cCount
  }, [catalogProducts, combos])

  const orderCount = useMemo(() => {
    const pCount = catalogProducts.filter((p) => isProductAvailableInModality(p, 'order')).length
    const cCount = combos.filter((c) => (c.sale_type || 'order') === 'order').length
    return pCount + cCount
  }, [catalogProducts, combos])

  // Agrupamento de Produtos por Categoria
  const groupedCategories = useMemo(() => {
    const list: Array<{
      category: Category | null
      products: ProductWithCategory[]
      combos: ComboWithRules[]
    }> = []

    for (const cat of categories) {
      const catProducts = productsInTab.filter((p) => p.category_id === cat.id)
      if (catProducts.length > 0) {
        list.push({
          category: cat,
          products: catProducts,
          combos: [],
        })
      }
    }

    const uncategorizedProducts = productsInTab.filter(
      (p) => !p.category_id || !categories.some((c) => c.id === p.category_id)
    )

    if (uncategorizedProducts.length > 0) {
      list.push({
        category: null,
        products: uncategorizedProducts,
        combos: [],
      })
    }

    return list
  }, [categories, productsInTab])

  // Abrir Modal de Detalhes do Produto
  const handleOpenProductModal = (product: ProductWithCategory) => {
    setSelectedProductForModal(product)
    setModalProductQuantity(1)
  }

  // Operações do Carrinho para Produtos Simples
  const handleAddProductToCart = (product: ProductWithCategory, quantityToAdd: number = 1) => {
    const isReady = activeTab === 'ready_delivery'
    if (isReady && !isStoreCurrentlyOpen) {
      setIsClosedModalOpen(true)
      return
    }

    const price = getProductPriceForModality(product, activeTab)
    const cartKey = `${product.id}_${activeTab}`

    setCart((prev) => {
      const current = prev[cartKey]
      const currentQty = current?.quantity ?? 0
      const maxQty = product.track_stock ? product.stock_quantity ?? 99 : 99

      const newQty = Math.min(currentQty + quantityToAdd, maxQty)
      if (newQty <= currentQty && currentQty >= maxQty) return prev

      return {
        ...prev,
        [cartKey]: {
          id: cartKey,
          type: 'product',
          productId: product.id,
          productName: product.name,
          productImageUrl: product.image_url,
          unitPrice: price,
          quantity: newQty,
          maxQuantity: maxQty,
          saleType: activeTab,
          leadTimeDays: activeTab === 'order' ? product.lead_time_days ?? 0 : 0,
        },
      }
    })

    setSelectedProductForModal(null)
  }

  const handleRemoveProductFromCart = (cartKey: string) => {
    setCart((prev) => {
      const current = prev[cartKey]
      if (!current) return prev

      if (current.quantity <= 1) {
        const next = { ...prev }
        delete next[cartKey]
        return next
      }

      return {
        ...prev,
        [cartKey]: {
          ...current,
          quantity: current.quantity - 1,
        },
      }
    })
  }

  // Operações do Carrinho para Drop Items
  const handleAddDropItemToCart = (item: DropWithItems['items'][0]) => {
    if (!isStoreCurrentlyOpen) {
      setIsClosedModalOpen(true)
      return
    }

    const product = item.product
    if (!product) return

    const price =
      item.promotional_price ??
      item.custom_price ??
      product.promotional_price ??
      product.price

    const remainingStock = Math.max(0, item.allocated_quantity - item.sold_quantity)
    const cartKey = `drop_${item.id}`

    setCart((prev) => {
      const currentQty = prev[cartKey]?.quantity ?? 0
      if (currentQty >= remainingStock) return prev

      return {
        ...prev,
        [cartKey]: {
          id: cartKey,
          type: 'product',
          productId: product.id,
          dropItemId: item.id,
          productName: product.name,
          productImageUrl: product.image_url,
          unitPrice: price,
          quantity: currentQty + 1,
          maxQuantity: remainingStock,
          saleType: 'ready_delivery',
          leadTimeDays: 0,
        },
      }
    })
  }

  const handleRemoveDropItemFromCart = (cartKey: string) => {
    setCart((prev) => {
      const current = prev[cartKey]
      if (!current) return prev

      if (current.quantity <= 1) {
        const next = { ...prev }
        delete next[cartKey]
        return next
      }

      return {
        ...prev,
        [cartKey]: {
          ...current,
          quantity: current.quantity - 1,
        },
      }
    })
  }

  // Abertura do Modal de Combo
  const handleOpenComboModal = (combo: ComboWithRules) => {
    const isReady = (combo.sale_type || 'order') === 'ready_delivery'
    if (isReady && !isStoreCurrentlyOpen) {
      setIsClosedModalOpen(true)
      return
    }

    setSelectedCombo(combo)
    setComboChoices({})
  }

  // Alteração de quantidade de um produto dentro da regra do combo
  const handleComboChoiceChange = (
    productId: string,
    categoryId: string,
    delta: number,
    requiredForCategory: number
  ) => {
    setComboChoices((prev) => {
      const currentCountForProduct = prev[productId] || 0
      const nextProductCount = Math.max(0, currentCountForProduct + delta)

      const currentCategoryTotalWithoutThis = Object.entries(prev)
        .filter(([pId]) => {
          if (pId === productId) return false
          const prod = catalogProducts.find((p) => p.id === pId)
          return prod?.category_id === categoryId && isProductAvailableInModality(prod, activeTab)
        })
        .reduce((sum, [, qty]) => sum + qty, 0)

      const nextCategoryTotal = currentCategoryTotalWithoutThis + nextProductCount

      if (nextCategoryTotal > requiredForCategory) {
        return prev
      }

      if (nextProductCount === 0) {
        const next = { ...prev }
        delete next[productId]
        return next
      }

      return {
        ...prev,
        [productId]: nextProductCount,
      }
    })
  }

  // Validação das Regras do Combo Selecionado
  const comboValidation = useMemo(() => {
    if (!selectedCombo) return { isComplete: false, rulesStatus: [] }

    const rulesStatus = selectedCombo.rules.map((rule) => {
      const currentCount = Object.entries(comboChoices)
        .filter(([pId]) => {
          const prod = catalogProducts.find((p) => p.id === pId)
          return prod?.category_id === rule.category_id && isProductAvailableInModality(prod, activeTab)
        })
        .reduce((sum, [, qty]) => sum + qty, 0)

      const isSatisfied = currentCount === rule.required_quantity
      const remaining = rule.required_quantity - currentCount

      return {
        rule,
        currentCount,
        required: rule.required_quantity,
        isSatisfied,
        remaining,
      }
    })

    const isComplete =
      rulesStatus.length > 0 && rulesStatus.every((s) => s.isSatisfied)

    return { isComplete, rulesStatus }
  }, [selectedCombo, comboChoices, catalogProducts, activeTab])

  // Adicionar Combo Customizado ao Carrinho
  const handleAddComboToCart = () => {
    if (!selectedCombo || !comboValidation.isComplete) return

    const isReady = (selectedCombo.sale_type || 'order') === 'ready_delivery'
    if (isReady && !isStoreCurrentlyOpen) {
      setSelectedCombo(null)
      setIsClosedModalOpen(true)
      return
    }

    const choicesArray: CartItemChoice[] = []
    Object.entries(comboChoices).forEach(([productId, quantity]) => {
      if (quantity > 0) {
        const product = catalogProducts.find((p) => p.id === productId)
        if (product) {
          choicesArray.push({
            productId: product.id,
            name: product.name,
            quantity,
            categoryId: product.category_id ?? undefined,
          })
        }
      }
    })

    const comboCartKey = `combo_${selectedCombo.id}_${Date.now()}`

    setCart((prev) => ({
      ...prev,
      [comboCartKey]: {
        id: comboCartKey,
        type: 'combo',
        comboId: selectedCombo.id,
        productId: null,
        productName: selectedCombo.name,
        productImageUrl: selectedCombo.image_url,
        unitPrice: selectedCombo.price,
        quantity: 1,
        saleType: (selectedCombo.sale_type as 'ready_delivery' | 'order') ?? 'order',
        customizations: {
          combo_id: selectedCombo.id,
          combo_name: selectedCombo.name,
          choices: choicesArray,
        },
      },
    }))

    setSelectedCombo(null)
    setComboChoices({})
  }

  // Remover combo do carrinho
  const handleRemoveComboFromCart = (cartKey: string) => {
    setCart((prev) => {
      const next = { ...prev }
      delete next[cartKey]
      return next
    })
  }

  // Cálculos do Carrinho
  const cartItemsList = Object.values(cart)
  const totalCartCount = cartItemsList.reduce((acc, item) => acc + item.quantity, 0)
  const cartSubtotal = cartItemsList.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0
  )

  const handleGoToCheckout = () => {
    router.push(`/${store.slug}/checkout`)
  }

  // Função auxiliar para calcular tempo restante de Drops
  const getDropTimeLeft = (drop: DropWithItems) => {
    let targetDate: number | null = null
    let label = ''

    if (drop.status === 'scheduled' && drop.starts_at) {
      targetDate = new Date(drop.starts_at).getTime()
      label = 'Inicia em'
    } else if (drop.ends_at) {
      targetDate = new Date(drop.ends_at).getTime()
      label = 'Encerra em'
    }

    if (!targetDate) return null

    const diff = targetDate - currentTime
    if (diff <= 0) {
      return { isEnded: true, label: 'Encerrada', hours: 0, minutes: 0, seconds: 0 }
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { isEnded: false, label, hours, minutes, seconds }
  }

  return (
    <div
      className="min-h-screen pb-28 transition-colors"
      style={
        {
          '--primary': theme.primary_color,
          '--store-primary': theme.primary_color,
          '--store-secondary': theme.secondary_color,
          '--store-bg': theme.background_color,
          '--store-card': theme.card_color,
          '--store-text': theme.text_color,
          '--store-primary-contrast': primaryContrastText,
          '--store-secondary-contrast': secondaryContrastText,
          '--store-font-weight-body': fontWeights.bodyWeight,
          '--store-font-weight-heading': fontWeights.headingWeight,
          backgroundColor: theme.background_color,
          color: theme.text_color,
          fontFamily: selectedFont.cssFamily,
        } as React.CSSProperties
      }
    >
      {/* Injeção dinâmica da Google Font selecionada para a vitrine */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${selectedFont.googleFamily}&display=swap`}
      />

      <div
        className="max-w-6xl mx-auto min-h-screen shadow-sm flex flex-col border-x border-neutral-200/80"
        style={{ backgroundColor: theme.card_color }}
      >
        {/* Header da Loja */}
        <header className="relative">
          {store.banner_url ? (
            <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] bg-neutral-100 rounded-b-2xl overflow-hidden">
              <Image
                src={store.banner_url}
                alt={store.name}
                fill
                sizes="(max-width: 1024px) 100vw, 1200px"
                className="object-cover object-center"
                priority
                unoptimized
              />
            </div>
          ) : (
            <div
              className="relative w-full aspect-[3/1] sm:aspect-[4/1] flex items-center justify-center rounded-b-2xl overflow-hidden"
              style={{
                backgroundColor: primaryColor,
                opacity: 0.9,
              }}
            >
              <Flame className="size-12 sm:size-16 text-white/80" />
            </div>
          )}

          <div
            className="px-4 sm:px-6 lg:px-8 pb-5 space-y-4 border-b border-neutral-200/80"
            style={{ backgroundColor: theme.card_color }}
          >
            {/* Linha Superior com Avatar Sobreposto ao Banner e Badges de Status */}
            <div className="flex items-end justify-between gap-3 -mt-9 sm:-mt-12">
              {/* Avatar do Logotipo (Com Fallback Elegante) */}
              <div
                className="size-20 sm:size-24 rounded-full border-4 overflow-hidden relative shrink-0 shadow-md flex items-center justify-center z-10"
                style={{
                  borderColor: theme.card_color,
                  backgroundColor: store.logo_url ? '#ffffff' : primaryColor,
                }}
              >
                {store.logo_url ? (
                  <Image
                    src={store.logo_url}
                    alt={store.name}
                    fill
                    sizes="(max-width: 640px) 80px, 96px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span
                    className="text-2xl sm:text-3xl font-black uppercase select-none tracking-wider"
                    style={{ color: primaryContrastText }}
                  >
                    {store.name ? store.name.trim().charAt(0).toUpperCase() : 'L'}
                  </span>
                )}
              </div>

              {/* Badges de Status e WhatsApp */}
              <div className="flex items-center gap-2 flex-wrap justify-end pb-1">
                {/* Badge Interativa de Status e Horário de Funcionamento */}
                <button
                  type="button"
                  onClick={() => setIsHoursModalOpen(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:opacity-90 min-h-[36px] ${
                    isStoreCurrentlyOpen
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                      : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/70'
                  }`}
                  title="Clique para ver todos os horários de funcionamento"
                >
                  <span
                    className={`size-2 rounded-full shrink-0 ${
                      isStoreCurrentlyOpen
                        ? 'bg-emerald-600 animate-pulse'
                        : 'bg-rose-600'
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {isStoreCurrentlyOpen
                      ? openStatus.todaySchedule?.open && openStatus.todaySchedule?.close
                        ? `Aberto agora • ${openStatus.todaySchedule.open} às ${openStatus.todaySchedule.close}`
                        : 'Aberto agora'
                      : openStatus.nextOpening
                      ? `Fechado agora • ${openStatus.nextOpening}`
                      : openStatus.todaySchedule?.isOpen && openStatus.todaySchedule?.open && openStatus.todaySchedule?.close
                      ? `Fechado agora • Hoje: ${openStatus.todaySchedule.open} às ${openStatus.todaySchedule.close}`
                      : 'Fechado agora'}
                  </span>
                  <span className="sm:hidden">
                    {isStoreCurrentlyOpen ? 'Aberto agora' : 'Fechado agora'}
                  </span>
                  <Clock className="size-3.5 opacity-60 ml-0.5 shrink-0" />
                </button>

                {store.whatsapp_number && (
                  <a
                    href={`https://wa.me/${store.whatsapp_number.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 px-3.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 text-xs font-semibold border border-emerald-200 hover:bg-emerald-100 transition-all min-h-[36px]"
                    title="Falar no WhatsApp"
                  >
                    <MessageCircle className="size-4" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>

            {/* Informações da Loja: Nome e Descrição */}
            <div className="space-y-1">
              <h1
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight"
                style={{
                  color: theme.text_color,
                  fontWeight: fontWeights.headingWeight,
                }}
              >
                {store.name}
              </h1>
              {store.description && (
                <p
                  className="text-xs sm:text-sm opacity-75 line-clamp-2 leading-relaxed"
                  style={{
                    color: theme.text_color,
                    fontWeight: fontWeights.bodyWeight,
                  }}
                >
                  {store.description}
                </p>
              )}
            </div>

            {/* CARD INTERATIVO DE ENDEREÇO DE RETIRADA */}
            {pickupAddress && pickupAddress.street && (
              <button
                type="button"
                onClick={() => setIsPickupModalOpen(true)}
                className="w-full flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl bg-neutral-50/90 hover:bg-neutral-100/90 border border-neutral-200/90 hover:border-neutral-300 text-left transition-all group shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="size-9 rounded-lg bg-white border border-neutral-200/90 flex items-center justify-center shrink-0 shadow-2xs group-hover:border-neutral-400 group-hover:scale-105 transition-all text-neutral-800 mt-0.5">
                    <MapPin className="size-4.5 text-neutral-800" />
                  </div>
                  <div className="min-w-0 space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Local para Retirada
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white border border-neutral-200 text-neutral-600 font-medium">
                        {LOCATION_TYPE_SHORT_LABELS[pickupAddress.location_type || 'store']}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-neutral-900 leading-snug">
                      {compactPickupAddress}
                    </p>
                    {/* Link de ação posicionado abaixo do endereço */}
                    <div className="flex items-center gap-1 text-xs font-semibold text-neutral-600 group-hover:text-neutral-900 transition-colors pt-0.5">
                      <span className="underline decoration-neutral-300 group-hover:decoration-neutral-900 underline-offset-2">
                        Ver detalhes e mapa
                      </span>
                      <ChevronRight className="size-3.5 text-neutral-400 group-hover:text-neutral-900 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-center size-8 rounded-full bg-white/80 border border-neutral-200/90 text-neutral-400 group-hover:text-neutral-900 group-hover:border-neutral-300 transition-all">
                  <ChevronRight className="size-4" />
                </div>
              </button>
            )}
          </div>

          {/* Abas Superiores: Pronta-Entrega vs Encomendas */}
          <div className="p-3 sm:p-4 bg-neutral-100/60 border-b border-neutral-200/80 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-xl border border-neutral-200/80 shadow-2xs max-w-md mx-auto sm:mx-0">
              <button
                type="button"
                onClick={() => setActiveTab('ready_delivery')}
                style={
                  activeTab === 'ready_delivery'
                    ? {
                        backgroundColor: primaryColor,
                        color: primaryContrastText,
                        fontWeight: fontWeights.headingWeight,
                      }
                    : {
                        color: theme.text_color,
                        fontWeight: fontWeights.bodyWeight,
                      }
                }
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold min-h-[44px] transition-all cursor-pointer ${
                  activeTab === 'ready_delivery'
                    ? 'shadow-xs'
                    : 'hover:opacity-80 hover:bg-black/5'
                }`}
              >
                <Zap className="size-3.5" />
                <span>Pronta-Entrega</span>
                {readyDeliveryCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                      activeTab === 'ready_delivery'
                        ? 'bg-black/20 text-current'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {readyDeliveryCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('order')}
                style={
                  activeTab === 'order'
                    ? {
                        backgroundColor: primaryColor,
                        color: primaryContrastText,
                        fontWeight: fontWeights.headingWeight,
                      }
                    : {
                        color: theme.text_color,
                        fontWeight: fontWeights.bodyWeight,
                      }
                }
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold min-h-[44px] transition-all cursor-pointer ${
                  activeTab === 'order'
                    ? 'shadow-xs'
                    : 'hover:opacity-80 hover:bg-black/5'
                }`}
              >
                <Calendar className="size-3.5" />
                <span>Encomendas</span>
                {orderCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                      activeTab === 'order'
                        ? 'bg-black/20 text-current'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {orderCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Frase Informativa e Minimalista */}
          <div className="bg-neutral-50/80 px-4 sm:px-6 lg:px-8 py-2.5 border-b border-neutral-200/80 text-xs text-neutral-600 flex items-center justify-center gap-2 text-center leading-relaxed">
            <span>⚡ <strong>Pronta-entrega:</strong> disponível no horário de funcionamento</span>
            <span className="text-neutral-300">|</span>
            <span>📅 <strong>Encomendas:</strong> aceitas 24h</span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 space-y-8 flex-1">
          {/* Banner Informativo quando Pronta-Entrega estiver fechada */}
          {!isStoreCurrentlyOpen && activeTab === 'ready_delivery' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <AlertCircle className="size-4.5 text-amber-700 shrink-0" />
                <span>Pronta-Entrega Pausada no Momento</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Estamos fora do horário de funcionamento ({openStatus.nextOpening || 'reabriremos em breve'}).
                Você pode realizar seus pedidos sob <strong>Encomenda</strong> 24h por dia com agendamento de data!
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('order')}
                className="inline-flex items-center gap-1.5 font-semibold text-neutral-900 underline text-xs pt-1 hover:text-neutral-700 cursor-pointer"
              >
                Ver cardápio de Encomendas <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}

          {/* Seções Principais Dinamicamente Reordenáveis */}
          {sectionsOrder.map((sectionKey) => {
            if (sectionKey === 'drops') {
              if (activeTab !== 'ready_delivery' || dropsList.length === 0) return null
              return (
                <div key="section-drops" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                      <Flame className="size-3.5 text-neutral-700" />
                      Fornadas & Pré-Vendas Abertas
                    </span>
                  </div>

                  {dropsList.map((drop) => {
                    const timer = getDropTimeLeft(drop)

                    return (
                      <div
                        key={drop.id}
                        className="rounded-2xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden space-y-4"
                      >
                        <div className="bg-neutral-50/70 p-4 border-b border-neutral-200/80 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="relative flex size-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75" />
                                <span className="relative inline-flex rounded-full size-2 bg-neutral-900" />
                              </span>
                              <h3 className="text-sm sm:text-base font-semibold text-neutral-900">
                                {drop.title}
                              </h3>
                            </div>

                            {timer && !timer.isEnded && (
                              <div className="flex items-center gap-1 font-mono text-xs font-medium text-neutral-800 bg-white px-2.5 py-1 rounded-md border border-neutral-200 tabular-nums shadow-2xs">
                                <Clock className="size-3 text-neutral-500" />
                                <span>
                                  {String(timer.hours).padStart(2, '0')}:
                                  {String(timer.minutes).padStart(2, '0')}:
                                  {String(timer.seconds).padStart(2, '0')}
                                </span>
                              </div>
                            )}
                          </div>

                          {drop.description && (
                            <p className="text-xs text-neutral-600 leading-relaxed">
                              {drop.description}
                            </p>
                          )}
                        </div>

                        {/* Itens do Drop */}
                        <div className="p-4 pt-0">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {drop.items.map((item) => {
                              const product = item.product
                              if (!product) return null

                              const cartKey = `${item.id}_ready_delivery`
                              const cartQuantity = cart[cartKey]?.quantity ?? 0
                              const isSoldOut = item.allocated_quantity <= 0
                              const remainingStock = item.allocated_quantity

                              return (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/40 hover:bg-neutral-50 transition-colors gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {product.image_url ? (
                                      <div className="size-12 rounded-lg overflow-hidden relative shrink-0 bg-neutral-100 border border-neutral-200">
                                        <Image
                                          src={product.image_url}
                                          alt={product.name}
                                          fill
                                          sizes="48px"
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    ) : (
                                      <div className="size-12 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 text-neutral-400">
                                        <ShoppingBag className="size-5" />
                                      </div>
                                    )}

                                    <div className="min-w-0 space-y-0.5">
                                      <h4 className="text-xs sm:text-sm font-medium text-neutral-900 truncate">
                                        {product.name}
                                      </h4>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-neutral-900 font-mono">
                                          {formatCurrency(item.custom_price ?? product.price)}
                                        </span>
                                        {!isSoldOut && (
                                          <span className="text-[10px] text-neutral-500 font-medium">
                                            {remainingStock} restantes
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {isSoldOut ? (
                                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                                        Esgotado
                                      </Badge>
                                    ) : !isStoreCurrentlyOpen ? (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        onClick={() => setIsClosedModalOpen(true)}
                                        className="h-8 text-xs px-2.5 text-neutral-500 border-neutral-200 bg-neutral-50 hover:bg-neutral-100"
                                      >
                                        <Lock className="size-3 mr-1 text-neutral-400" /> Fechado
                                      </Button>
                                    ) : cartQuantity === 0 ? (
                                      <Button
                                        size="xs"
                                        onClick={() => handleAddDropItemToCart(item)}
                                        style={{ backgroundColor: primaryColor }}
                                        className="h-8 text-xs px-3 hover:opacity-90 text-white font-medium cursor-pointer"
                                      >
                                        <Plus className="size-3.5 mr-1" /> Adicionar
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200">
                                        <Button
                                          size="icon-xs"
                                          variant="ghost"
                                          onClick={() => handleRemoveDropItemFromCart(cartKey)}
                                          className="size-6 text-neutral-900 cursor-pointer"
                                        >
                                          <Minus className="size-2.5" />
                                        </Button>
                                        <span className="w-5 text-center text-xs font-bold text-neutral-900 font-mono">
                                          {cartQuantity}
                                        </span>
                                        <Button
                                          size="icon-xs"
                                          variant="ghost"
                                          disabled={cartQuantity >= remainingStock}
                                          onClick={() => handleAddDropItemToCart(item)}
                                          className="size-6 text-neutral-900 cursor-pointer"
                                        >
                                          <Plus className="size-2.5" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            if (sectionKey === 'combos') {
              if (combosInTab.length === 0) return null
              return (
                <div key="section-combos" className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-neutral-200/80 pb-2">
                    <Boxes className="size-4 text-neutral-900" />
                    <h2 className="text-sm sm:text-base font-bold text-neutral-900 uppercase tracking-wider">
                      {activeTab === 'ready_delivery'
                        ? 'Combos Pronta-Entrega'
                        : 'Caixas & Kits para Encomenda'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center items-stretch">
                    {combosInTab.map((combo) => {
                      const isComboReady = (combo.sale_type || 'order') === 'ready_delivery'
                      const isLocked = isComboReady && !isStoreCurrentlyOpen

                      return (
                        <div
                          key={combo.id}
                          className="group rounded-2xl overflow-hidden bg-white border border-neutral-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between w-full h-full"
                        >
                          <div>
                            {combo.image_url ? (
                              <div className="relative w-full aspect-[16/10] bg-neutral-100 overflow-hidden select-none">
                                <Image
                                  src={combo.image_url}
                                  alt={combo.name}
                                  fill
                                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                  unoptimized
                                />
                                <div className="absolute top-3 left-3 z-10">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-neutral-900 backdrop-blur-md shadow-xs border border-neutral-200/80">
                                    <Sparkles className="size-3.5 text-neutral-700" />
                                    <span>Combo Fechado</span>
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="relative w-full aspect-[16/10] bg-neutral-100 overflow-hidden select-none flex flex-col items-center justify-center text-neutral-400 gap-2 p-4">
                                <Boxes className="size-10 text-neutral-300 stroke-[1.5]" />
                                <span className="text-xs text-neutral-400 font-medium">Foto em breve</span>
                              </div>
                            )}

                            <div className="p-5 sm:p-6 space-y-3">
                              <div className="space-y-1.5">
                                <h3 className="font-bold text-lg sm:text-xl text-neutral-900 leading-snug group-hover:text-neutral-800 transition-colors">
                                  {combo.name}
                                </h3>

                                {combo.description && (
                                  <p className="text-sm sm:text-base text-neutral-600 line-clamp-3 leading-relaxed">
                                    {combo.description}
                                  </p>
                                )}
                              </div>

                              {combo.rules.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1.5">
                                  {combo.rules.map((rule) => (
                                    <span
                                      key={rule.id}
                                      className="text-xs font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 px-2.5 py-0.5 rounded-md"
                                    >
                                      {rule.required_quantity}x {rule.category?.name || 'Item'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="p-5 sm:p-6 pt-0 mt-auto">
                            <div className="flex justify-between items-center pt-4 border-t border-neutral-100/90 gap-3">
                              <div className="flex flex-col">
                                <span className="text-xl sm:text-2xl font-bold text-neutral-900 font-mono tabular-nums">
                                  {formatCurrency(combo.price)}
                                </span>
                              </div>

                              <div>
                                {isLocked ? (
                                  <Button
                                    onClick={() => setIsClosedModalOpen(true)}
                                    variant="outline"
                                    className="h-10 text-xs font-medium text-neutral-500 border-neutral-200 bg-neutral-50 hover:bg-neutral-100 gap-1.5 px-3.5 cursor-pointer"
                                  >
                                    <Lock className="size-3.5 text-neutral-400" />
                                    Pronta-entrega Fechada
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => handleOpenComboModal(combo)}
                                    style={{ backgroundColor: primaryColor }}
                                    className="h-10 text-xs sm:text-sm font-semibold gap-1.5 hover:opacity-90 text-white shadow-xs rounded-lg px-5 cursor-pointer"
                                  >
                                    <Sparkles className="size-4" />
                                    Montar Caixa
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            }

            if (sectionKey === 'categories') {
              if (groupedCategories.length === 0) {
                if (combosInTab.length > 0) return null
                return (
                  <div key="section-empty" className="p-8 sm:p-12 text-center bg-neutral-50 border border-dashed border-neutral-200/80 rounded-2xl space-y-2.5">
                    <div className="size-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400 shadow-2xs">
                      <ShoppingBag className="size-6" />
                    </div>
                    <h3 className="font-semibold text-sm text-neutral-900">
                      {activeTab === 'ready_delivery'
                        ? 'Nenhum item de pronta-entrega no momento'
                        : 'Nenhum item sob encomenda cadastrado'}
                    </h3>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                      Experimente alternar para a aba{' '}
                      <span className="font-semibold text-neutral-900">
                        {activeTab === 'ready_delivery' ? '📅 Encomendas' : '⚡ Pronta-Entrega'}
                      </span>
                      .
                    </p>
                  </div>
                )
              }

              return (
                <div key="section-categories" className="space-y-8">
                  {groupedCategories.map(({ category, products }) => {
                    return (
                      <div key={category?.id || 'uncategorized'} className="space-y-4">
                        <div className="border-b border-neutral-200/80 pb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FolderTree className="size-4 text-neutral-900" />
                            <h3 className="text-sm sm:text-base font-bold uppercase tracking-wider text-neutral-900">
                              {category?.name || 'Geral'}
                            </h3>
                          </div>
                          <span className="text-xs text-neutral-500 font-medium">
                            {products.length} {products.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>

                        {/* Grid Responsivo de Alto Impacto: max-w-6xl, 1-col (mobile) -> 2-col (tablet) -> 3-col (desktop amplo) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center items-stretch">
                          {products.map((product) => {
                            const cartKey = `${product.id}_${activeTab}`
                            const cartQuantity = cart[cartKey]?.quantity ?? 0
                            const isProductReady = activeTab === 'ready_delivery'
                            const isLocked = isProductReady && !isStoreCurrentlyOpen

                            return (
                              <ProductCard
                                key={`${product.id}_${activeTab}`}
                                product={product}
                                currentModality={activeTab}
                                cartQuantity={cartQuantity}
                                onAddToCart={() => handleAddProductToCart(product, 1)}
                                onRemoveFromCart={() => handleRemoveProductFromCart(cartKey)}
                                onOpenModal={() => handleOpenProductModal(product)}
                                isLocked={isLocked}
                                onLockClick={() => setIsClosedModalOpen(true)}
                              />
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            return null
          })}

          {/* Seção de Perguntas Frequentes (FAQ) */}
          {faqs && faqs.length > 0 && (
            <div className="space-y-4 pt-8 border-t border-neutral-200/80">
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 flex items-center gap-2 font-heading">
                  <HelpCircle className="size-5 text-neutral-700" />
                  Perguntas Frequentes (FAQ)
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500">
                  Tire suas dúvidas sobre pedidos, entregas e atendimento da loja.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {faqs.map((faq, index) => {
                  const isExpanded = openFaqs[index] ?? false
                  return (
                    <div
                      key={faq.id || index}
                      className="rounded-xl border border-neutral-200/80 bg-white overflow-hidden shadow-2xs transition-all h-fit"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFaqs((prev) => ({
                            ...prev,
                            [index]: !prev[index],
                          }))
                        }
                        className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold text-neutral-900 hover:bg-neutral-50/60 transition-colors min-h-[48px] cursor-pointer"
                      >
                        <span>{faq.question}</span>
                        <ChevronDown
                          className={`size-4 text-neutral-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-neutral-900' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 text-xs sm:text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 mt-1 whitespace-pre-line">
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE DETALHES DO PRODUTO (COM QUANTIDADE E PREÇO DINÂMICO DA ABA ATIVA) */}
      <Dialog
        open={!!selectedProductForModal}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProductForModal(null)
            setModalProductQuantity(1)
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {selectedProductForModal && (() => {
            const product = selectedProductForModal
            const isReady = activeTab === 'ready_delivery'
            const isOrder = activeTab === 'order'
            const isLocked = isReady && !isStoreCurrentlyOpen
            const unitPrice = getProductPriceForModality(product, activeTab)
            const totalPrice = unitPrice * modalProductQuantity
            const maxQty = product.track_stock ? product.stock_quantity ?? 99 : 99
            const hasDiscount =
              !product.different_prices_by_mode &&
              product.promotional_price !== null &&
              product.promotional_price !== undefined &&
              product.promotional_price < product.price

            return (
              <>
                <DialogHeader className="p-4 pb-3 border-b border-neutral-200/80 bg-neutral-50/50">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="text-base font-bold text-neutral-900 truncate">
                      {product.name}
                    </DialogTitle>
                    {product.category?.name && (
                      <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md shrink-0">
                        {product.category.name}
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-neutral-500">
                    Detalhes e opções de pedido para este item.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Foto Panorâmica do Produto */}
                  <div className="relative w-full aspect-[16/10] bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200/60 select-none">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 450px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="size-full flex flex-col items-center justify-center text-neutral-400 gap-2 p-4">
                        <ShoppingBag className="size-8 text-neutral-300 stroke-[1.5]" />
                        <span className="text-xs text-neutral-400 font-medium">Foto em breve</span>
                      </div>
                    )}

                    {/* Badge da Modalidade Ativa sobre a foto */}
                    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-neutral-900 backdrop-blur-md shadow-xs border border-neutral-200/80">
                        {isOrder ? (
                          <>
                            <Calendar className="size-3.5 text-purple-700" />
                            <span>Encomenda</span>
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5 text-neutral-900 fill-neutral-900" />
                            <span>Pronta-entrega</span>
                          </>
                        )}
                      </span>
                    </div>

                    {hasDiscount && (
                      <div className="absolute top-3 right-3 z-10">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
                          OFERTA
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Descrição */}
                  {product.description && (
                    <div className="text-xs sm:text-sm text-neutral-600 leading-relaxed bg-neutral-50/60 p-3 rounded-xl border border-neutral-200/60">
                      {product.description}
                    </div>
                  )}

                  {/* Card de Regras e Preço da Modalidade da Aba */}
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                        {isOrder ? (
                          <>
                            <Calendar className="size-3.5 text-purple-600" />
                            Modalidade: Encomenda
                          </>
                        ) : (
                          <>
                            <Zap className="size-3.5 text-emerald-600" />
                            Modalidade: Pronta-Entrega
                          </>
                        )}
                      </span>
                      <span className="text-base font-bold text-neutral-900 font-mono tabular-nums">
                        {formatCurrency(unitPrice)} <span className="text-[11px] text-neutral-500 font-normal">/ un</span>
                      </span>
                    </div>

                    <p className="text-[11px] text-neutral-500 leading-relaxed">
                      {isOrder
                        ? (product.lead_time_days ?? 0) > 0
                          ? `📅 Produção sob encomenda. Requer no mínimo ${product.lead_time_days} dias de antecedência para agendamento.`
                          : '📅 Produção sob encomenda com agendamento de data no checkout.'
                        : '⚡ Item pronto para envio imediato durante o horário de funcionamento da loja.'}
                    </p>

                    {product.track_stock && isReady && (
                      <div className="text-[11px] font-medium text-neutral-600 pt-1">
                        Estoque disponível: <strong className="text-neutral-900 font-mono">{product.stock_quantity ?? 0} unidades</strong>
                      </div>
                    )}
                  </div>

                  {/* Seletor de Quantidade */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200/80">
                    <div>
                      <span className="text-xs font-semibold text-neutral-900 block">
                        Quantidade
                      </span>
                      <span className="text-[11px] text-neutral-500">
                        {formatCurrency(unitPrice)} cada
                      </span>
                    </div>

                    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg p-1 border border-neutral-200">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={modalProductQuantity <= 1}
                        onClick={() => setModalProductQuantity((q) => Math.max(1, q - 1))}
                        className="size-7 text-neutral-700 hover:bg-white rounded-md cursor-pointer"
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold text-neutral-900 font-mono tabular-nums">
                        {modalProductQuantity}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={modalProductQuantity >= maxQty}
                        onClick={() => setModalProductQuantity((q) => Math.min(maxQty, q + 1))}
                        className="size-7 text-neutral-700 hover:bg-white rounded-md cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <DialogFooter className="p-3 bg-neutral-50 border-t border-neutral-200/80">
                  {isLocked ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedProductForModal(null)
                        setIsClosedModalOpen(true)
                      }}
                      className="w-full text-xs font-semibold h-11 min-h-[44px] text-neutral-600 border-neutral-200 bg-white hover:bg-neutral-50 gap-1.5"
                    >
                      <Lock className="size-4 text-neutral-400" />
                      Pronta-Entrega Fechada no Momento
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleAddProductToCart(product, modalProductQuantity)}
                      style={{ backgroundColor: primaryColor }}
                      className="w-full font-bold text-xs sm:text-sm h-11 min-h-[44px] hover:opacity-90 text-white shadow-xs rounded-lg cursor-pointer"
                    >
                      <Plus className="size-4 mr-1.5" />
                      Adicionar ao Carrinho • {formatCurrency(totalPrice)}
                    </Button>
                  )}
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* MODAL INFORMATIVO: LOJA FECHADA PARA PRONTA-ENTREGA */}
      <Dialog open={isClosedModalOpen} onOpenChange={setIsClosedModalOpen}>
        <DialogContent className="sm:max-w-sm p-5 space-y-4">
          <DialogHeader>
            <div className="size-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-1">
              <Clock className="size-5" />
            </div>
            <DialogTitle className="text-center text-base font-semibold text-neutral-900">
              Pronta-Entrega Fechada
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-neutral-600 mt-1">
              Os itens de pronta-entrega estão disponíveis apenas durante o horário de funcionamento da loja.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-neutral-700">
              <span>Status atual:</span>
              <span className="font-semibold text-rose-700">Fechado agora</span>
            </div>
            {openStatus.nextOpening && (
              <div className="flex items-center justify-between text-neutral-700">
                <span>Previsão de Abertura:</span>
                <span className="font-semibold text-neutral-900">{openStatus.nextOpening}</span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            <Button
              onClick={() => {
                setIsClosedModalOpen(false)
                setActiveTab('order')
              }}
              style={{ backgroundColor: primaryColor }}
              className="w-full text-white text-xs font-medium h-10 min-h-[44px]"
            >
              <Calendar className="size-3.5 mr-1.5" />
              Fazer Pedido sob Encomenda (24h)
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsClosedModalOpen(false)}
              className="w-full text-xs font-medium h-10 min-h-[44px] border-neutral-200 text-neutral-700"
            >
              Entendi, voltar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL INTERATIVO: MONTE SUA CAIXA (COMBOS CUSTOMIZÁVEIS) */}
      <Dialog
        open={!!selectedCombo}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCombo(null)
            setComboChoices({})
          }
        }}
      >
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-neutral-200/80 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-neutral-900" />
              <DialogTitle className="text-base font-bold text-neutral-900">
                {selectedCombo?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-500">
              Monte sua caixa escolhendo os sabores abaixo de acordo com as regras.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Preço e Resumo */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div>
                <span className="text-[11px] text-neutral-500 block">
                  Preço Fechado da Caixa:
                </span>
                <span className="text-base font-extrabold text-neutral-900 font-mono tabular-nums">
                  {formatCurrency(selectedCombo?.price)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-neutral-500 block">
                  Status da Escolha:
                </span>
                <Badge
                  variant={comboValidation.isComplete ? 'default' : 'secondary'}
                  className={`text-[11px] font-bold ${
                    comboValidation.isComplete
                      ? 'bg-emerald-600 text-white'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {comboValidation.isComplete ? '✓ Caixa Completa!' : 'Escolhas Pendentes'}
                </Badge>
              </div>
            </div>

            {/* Regras e Produtos por Categoria */}
            {comboValidation.rulesStatus.map(({ rule, currentCount, required, isSatisfied }) => {
              const categoryProducts = catalogProducts.filter(
                (p) => p.category_id === rule.category_id && isProductAvailableInModality(p, activeTab)
              )

              return (
                <div
                  key={rule.id}
                  className={`rounded-xl border p-3.5 space-y-3 transition-all ${
                    isSatisfied
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-neutral-200/80 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <FolderTree className="size-3.5 text-neutral-700" />
                        {rule.category?.name || 'Categoria'}
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Exigido: Escolha exatamente {required} {required === 1 ? 'item' : 'itens'}.
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[11px] font-mono font-bold ${
                        isSatisfied
                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                          : 'border-amber-300 text-amber-800 bg-amber-50'
                      }`}
                    >
                      {currentCount}/{required}
                    </Badge>
                  </div>

                  {categoryProducts.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-2">
                      Nenhum produto disponível para {activeTab === 'ready_delivery' ? 'pronta-entrega' : 'encomenda'} nesta categoria.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {categoryProducts.map((prod) => {
                        const qty = comboChoices[prod.id] || 0
                        const canIncrement = currentCount < required

                        return (
                          <div
                            key={prod.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-white border border-neutral-200/80"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              {prod.image_url && (
                                <div className="size-10 rounded-md bg-neutral-100 overflow-hidden shrink-0 relative border border-neutral-200">
                                  <Image
                                    src={prod.image_url}
                                    alt={prod.name}
                                    fill
                                    sizes="40px"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                              )}
                              <span className="text-xs font-medium text-neutral-900 truncate">
                                {prod.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 shrink-0">
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                disabled={qty <= 0}
                                onClick={() =>
                                  handleComboChoiceChange(
                                    prod.id,
                                    rule.category_id,
                                    -1,
                                    required
                                  )
                                }
                                className="size-6 text-neutral-700 cursor-pointer"
                              >
                                <Minus className="size-2.5" />
                              </Button>
                              <span className="w-5 text-center text-xs font-bold text-neutral-900">
                                {qty}
                              </span>
                              <Button
                                size="icon-xs"
                                variant="ghost"
                                disabled={!canIncrement}
                                onClick={() =>
                                  handleComboChoiceChange(
                                    prod.id,
                                    rule.category_id,
                                    1,
                                    required
                                  )
                                }
                                className="size-6 text-neutral-900 cursor-pointer"
                              >
                                <Plus className="size-2.5" />
                              </Button>
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

          <DialogFooter className="p-3 bg-neutral-50 border-t border-neutral-200/80">
            <Button
              type="button"
              onClick={handleAddComboToCart}
              disabled={!comboValidation.isComplete}
              style={
                comboValidation.isComplete
                  ? { backgroundColor: primaryColor }
                  : undefined
              }
              className="w-full font-bold text-xs h-10 min-h-[44px] hover:opacity-90 text-white cursor-pointer"
            >
              {comboValidation.isComplete ? (
                <>
                  <CheckCircle2 className="size-4 mr-1.5" />
                  Adicionar Caixa ao Carrinho • {formatCurrency(selectedCombo?.price)}
                </>
              ) : (
                'Complete todas as escolhas para adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DRAWER / DETALHES DO CARRINHO */}
      <Dialog open={isCartDrawerOpen} onOpenChange={setIsCartDrawerOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b border-neutral-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4 text-neutral-900" />
                <DialogTitle className="text-base font-bold text-neutral-900">
                  Seu Carrinho ({totalCartCount})
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cartItemsList.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-neutral-200/80 bg-white space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      {item.type === 'combo' ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-neutral-100 text-neutral-800 border-neutral-200">
                          Combo
                        </Badge>
                      ) : null}
                      <h4 className="text-xs font-bold text-neutral-900 truncate">
                        {item.productName}
                      </h4>
                    </div>

                    <div className="text-xs font-semibold text-neutral-900 mt-0.5 font-mono tabular-nums">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      if (item.type === 'combo') {
                        handleRemoveComboFromCart(item.id)
                      } else if (item.dropItemId) {
                        handleRemoveDropItemFromCart(item.id)
                      } else if (item.productId) {
                        handleRemoveProductFromCart(item.productId)
                      }
                    }}
                    className="text-neutral-400 hover:text-rose-600 size-6 cursor-pointer"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {item.customizations?.choices && item.customizations.choices.length > 0 && (
                  <div className="p-2 rounded-lg bg-neutral-50 border border-neutral-200/60 text-[11px] space-y-1">
                    <span className="font-semibold text-neutral-500 block text-[10px] uppercase tracking-wider">
                      Sabores Selecionados:
                    </span>
                    <ul className="space-y-0.5">
                      {item.customizations.choices.map((c, i) => (
                        <li key={i} className="flex justify-between text-neutral-800">
                          <span>{c.name}</span>
                          <span className="font-bold text-neutral-900 font-mono">{c.quantity}x</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter className="p-4 border-t border-neutral-200/80 bg-neutral-50/50 flex flex-col gap-2 sm:flex-col">
            <div className="flex items-center justify-between text-sm font-semibold text-neutral-900">
              <span>Subtotal:</span>
              <span className="text-base font-semibold font-mono tabular-nums text-neutral-900">
                {formatCurrency(cartSubtotal)}
              </span>
            </div>

            <Button
              onClick={() => {
                setIsCartDrawerOpen(false)
                handleGoToCheckout()
              }}
              style={{ backgroundColor: primaryColor }}
              className="w-full font-medium h-11 min-h-[44px] gap-1.5 hover:opacity-90 text-white shadow-xs rounded-lg text-sm cursor-pointer"
            >
              Ir para o Checkout
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BARRA FLUTUANTE INFERIOR DO CARRINHO */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 shadow-md">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="text-left group cursor-pointer"
            >
              <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-medium group-hover:text-neutral-900 transition-colors">
                <ShoppingBag className="size-3" />
                {totalCartCount} {totalCartCount === 1 ? 'item' : 'itens'} no carrinho
              </span>
              <span className="text-base font-semibold text-neutral-900 font-mono tabular-nums">
                {formatCurrency(cartSubtotal)}
              </span>
            </button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsCartDrawerOpen(true)}
                className="text-xs h-10 min-h-[44px] font-medium bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200 cursor-pointer"
              >
                Ver Carrinho
              </Button>
              <Button
                onClick={handleGoToCheckout}
                style={{ backgroundColor: primaryColor }}
                className="px-4 font-medium shadow-xs gap-1.5 text-xs h-10 min-h-[44px] hover:opacity-90 text-white rounded-lg cursor-pointer"
              >
                Finalizar
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES DO ENDEREÇO DE RETIRADA */}
      <Dialog open={isPickupModalOpen} onOpenChange={setIsPickupModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="size-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2">
              <MapPin className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-neutral-900 font-heading">
              Local para Retirada no Local
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Endereço e instruções para retirada presencial na loja {store.name}.
            </DialogDescription>
          </DialogHeader>

          {pickupAddress && (
            <div className="space-y-4 py-2 text-xs">
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-900">
                    Endereço da Loja:
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-700 font-medium">
                    {LOCATION_TYPE_LABELS[pickupAddress.location_type || 'store']}
                  </span>
                </div>
                <p className="text-neutral-700 leading-relaxed font-medium">
                  {pickupAddress.street}, {pickupAddress.number}
                  {pickupAddress.complement ? ` - ${pickupAddress.complement}` : ''}
                  <br />
                  {pickupAddress.neighborhood} • {pickupAddress.city}/{pickupAddress.state}
                  {pickupAddress.zip_code ? ` • CEP ${pickupAddress.zip_code}` : ''}
                </p>
              </div>

              {pickupAddress.reference && (
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                  <span className="font-semibold text-amber-900 block">
                    📍 Ponto de Referência:
                  </span>
                  <p className="text-amber-800 leading-relaxed">
                    {pickupAddress.reference}
                  </p>
                </div>
              )}

              {pickupAddress.instructions && (
                <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-200/80 space-y-1">
                  <span className="font-semibold text-sky-900 block">
                    ℹ️ Instruções para a Retirada:
                  </span>
                  <p className="text-sky-800 leading-relaxed">
                    {pickupAddress.instructions}
                  </p>
                </div>
              )}

              {/* Ações: Copiar Endereço e Navegação (Waze / Maps) */}
              <div className="space-y-2 pt-2">
                {/* Botão de Copiar Endereço */}
                <button
                  type="button"
                  onClick={() =>
                    handleCopyAddress(
                      `${pickupAddress.street}, ${pickupAddress.number}${
                        pickupAddress.complement
                          ? ` - ${pickupAddress.complement}`
                          : ''
                      }, ${pickupAddress.neighborhood}, ${
                        pickupAddress.city
                      } - ${pickupAddress.state}${
                        pickupAddress.zip_code
                          ? `, CEP ${pickupAddress.zip_code}`
                          : ''
                      }`
                    )
                  }
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer min-h-[44px] ${
                    isAddressCopied
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                      : 'bg-white hover:bg-neutral-50 text-neutral-900 border-neutral-200 shadow-2xs'
                  }`}
                >
                  {isAddressCopied ? (
                    <>
                      <Check className="size-4 text-emerald-700" />
                      <span>Endereço copiado para a área de transferência!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4 text-neutral-700" />
                      <span>Copiar Endereço (para Waze / Uber)</span>
                    </>
                  )}
                </button>

                {/* Atalhos Rápidos para Aplicativos */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <a
                    href={`https://waze.com/ul?q=${encodeURIComponent(
                      `${pickupAddress.street}, ${pickupAddress.number}, ${pickupAddress.neighborhood}, ${pickupAddress.city} - ${pickupAddress.state}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-sky-50 text-sky-900 border border-sky-200/80 font-semibold text-xs hover:bg-sky-100 transition-colors min-h-[44px]"
                  >
                    <Navigation className="size-3.5 text-sky-700" />
                    Abrir no Waze
                  </a>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${pickupAddress.street}, ${pickupAddress.number}, ${pickupAddress.neighborhood}, ${pickupAddress.city} - ${pickupAddress.state}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors min-h-[44px]"
                  >
                    <ExternalLink className="size-3.5" />
                    Google Maps
                  </a>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL DE HORÁRIOS DE FUNCIONAMENTO */}
      <Dialog open={isHoursModalOpen} onOpenChange={setIsHoursModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
          <DialogHeader>
            <div className="size-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2">
              <Clock className="size-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-neutral-900 font-heading">
              Horários de Funcionamento
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Confira os horários de atendimento da loja {store.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Status Atual em Destaque */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                isStoreCurrentlyOpen
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-rose-50/80 border-rose-200 text-rose-950'
              }`}
            >
              <span
                className={`size-2.5 rounded-full shrink-0 ${
                  isStoreCurrentlyOpen
                    ? 'bg-emerald-600 animate-pulse'
                    : 'bg-rose-600'
                }`}
              />
              <div className="text-xs">
                <strong className="block font-semibold">
                  {isStoreCurrentlyOpen ? 'Loja Aberta Agora' : 'Loja Fechada no Momento'}
                </strong>
                <span className="opacity-90">
                  {isStoreCurrentlyOpen
                    ? openStatus.todaySchedule?.close
                      ? `Atendimento hoje até às ${openStatus.todaySchedule.close}`
                      : 'Recebendo pedidos normalmente'
                    : openStatus.nextOpening
                    ? openStatus.nextOpening
                    : 'Aguarde a reabertura para novos pedidos'}
                </span>
              </div>
            </div>

            {/* Tabela de Horários da Semana */}
            <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-xl overflow-hidden bg-neutral-50/50">
              {DAYS_OF_WEEK.map((day) => {
                const sched = parsedBusinessHours ? parsedBusinessHours[day.key] : null
                const isToday = day.dayIndex === currentDayIndex
                const isOpenDay = sched ? sched.isOpen && sched.open && sched.close : false

                return (
                  <div
                    key={day.key}
                    className={`flex items-center justify-between px-3.5 py-2.5 transition-colors ${
                      isToday ? 'bg-neutral-100/90 font-medium' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isToday ? 'font-bold text-neutral-900' : 'text-neutral-700'
                        }
                      >
                        {day.label}
                      </span>
                      {isToday && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-900 text-white font-semibold uppercase tracking-wider">
                          Hoje
                        </span>
                      )}
                    </div>

                    <div>
                      {isOpenDay && sched ? (
                        <span className="font-mono tabular-nums text-neutral-800 font-semibold">
                          {sched.open} às {sched.close}
                        </span>
                      ) : (
                        <span className="text-neutral-400 font-normal">Fechado</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
