'use client'

import * as React from 'react'
import { useState, useTransition, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  type Store,
  type StoreTheme,
  getStoreTheme,
  APPROVED_GOOGLE_FONTS,
  getFontWeightStyles,
  getContrastTextColor,
  getStorePickupAddress,
  formatStorePickupAddressCompact,
  LOCATION_TYPE_SHORT_LABELS,
  isStoreOpen,
} from '@/lib/domain/stores'
import type { Category } from '@/lib/domain/categories'
import type { ProductWithCategory } from '@/lib/domain/products'
import type { ComboWithRules } from '@/lib/domain/combos'
import type { DropWithItems } from '@/lib/domain/drops'
import {
  formatCurrency,
  isProductAvailableInModality,
} from '@/lib/domain/products'
import {
  type StorefrontSectionKey,
  getStorefrontSectionsOrder,
  createReorderPayload,
  type SaveAllStorefrontPayload,
} from '@/lib/domain/storefront-organization'
import { saveAllStorefrontChangesAction } from './actions'
import { StoreAppearanceTab } from '@/components/admin/store-appearance-tab'
import { ProductCard } from '@/components/store/product-card'
import {
  GripVertical,
  Flame,
  Boxes,
  FolderTree,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowUp,
  ArrowDown,
  Clock,
  MapPin,
  MessageCircle,
  Calendar,
  Zap,
  ShoppingBag,
  Smartphone,
  Monitor,
  RotateCcw,
  Palette,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StorefrontOrganizerClientProps {
  store: Store
  categories: Category[]
  products: ProductWithCategory[]
  combos: ComboWithRules[]
  activeDrops: DropWithItems[]
}

type ViewMode = 'desktop' | 'mobile'
type ModalityFilter = 'all' | 'ready_delivery' | 'order'

export function StorefrontOrganizerClient({
  store,
  categories: initialCategories,
  products: initialProducts,
  combos: initialCombos,
  activeDrops,
}: StorefrontOrganizerClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [activeModality, setActiveModality] = useState<ModalityFilter>('all')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Configuração dos Sensores dnd-kit com ativação suave (5px) para não colidir com cliques
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 1. Estado local das Seções Principais
  const initialSections = useMemo(
    () =>
      getStorefrontSectionsOrder(
        store.settings as Record<string, unknown> | null
      ),
    [store.settings]
  )
  const [sectionsOrder, setSectionsOrder] = useState<StorefrontSectionKey[]>(
    initialSections
  )

  // 2. Estado local das Categorias
  const [categories, setCategories] = useState<Category[]>(initialCategories)

  // 3. Estado local dos Produtos
  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts)

  // 4. Estado local dos Combos
  const [combos, setCombos] = useState<ComboWithRules[]>(initialCombos)

  // --- Estados de Aparência & Identidade Visual ---
  type StorefrontTab = 'appearance' | 'organize'
  const [activeTab, setActiveTab] = useState<StorefrontTab>('appearance')

  const initialTheme = useMemo(() => getStoreTheme(store), [store])
  const [theme, setTheme] = useState<StoreTheme>(initialTheme)
  const [bannerUrl, setBannerUrl] = useState<string>(store.banner_url || '')
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url || null)

  const handleThemeChange = (newTheme: StoreTheme) => {
    setTheme(newTheme)
    setHasUnsavedChanges(true)
  }

  const handleBannerChange = (url: string) => {
    setBannerUrl(url)
    setHasUnsavedChanges(true)
  }

  const handleLogoChange = (url: string) => {
    setLogoUrl(url)
    setHasUnsavedChanges(true)
  }

  // 5. Estado de Baseline para Descarte (Rascunho)
  const [savedBaseline, setSavedBaseline] = useState({
    sectionsOrder: initialSections,
    categories: initialCategories,
    products: initialProducts,
    combos: initialCombos,
    theme: initialTheme,
    bannerUrl: store.banner_url || '',
    logoUrl: store.logo_url || null,
  })

  // 6. Indicador de Alterações Não Salvas
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Feedback helper
  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Previne fechar a aba acidentalmente com alterações não salvas
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])
  const selectedFont = useMemo(() => {
    return (
      APPROVED_GOOGLE_FONTS.find((f) => f.id === theme.font_family) ||
      APPROVED_GOOGLE_FONTS[0]
    )
  }, [theme.font_family])

  const fontWeights = useMemo(
    () => getFontWeightStyles(theme.font_weight),
    [theme.font_weight]
  )
  const primaryContrastText = useMemo(
    () => getContrastTextColor(theme.primary_color),
    [theme.primary_color]
  )
  const secondaryContrastText = useMemo(
    () => getContrastTextColor(theme.secondary_color),
    [theme.secondary_color]
  )

  // Horários e Endereço da loja
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const openStatus = useMemo(() => {
    return isStoreOpen(store, new Date(currentTime))
  }, [store, currentTime])

  const pickupAddress = useMemo(() => getStorePickupAddress(store), [store])
  const compactPickupAddress = useMemo(
    () => formatStorePickupAddressCompact(pickupAddress),
    [pickupAddress]
  )

  // --- Handlers Locais em Memória (Custo ZERO de Rede e Banco durante a edição) ---

  // Reordenação de Seções
  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= sectionsOrder.length) return

    setSectionsOrder(arrayMove(sectionsOrder, index, newIndex))
    setHasUnsavedChanges(true)
  }

  // Reordenação de Categorias
  const handleMoveCategory = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= categories.length) return

    setCategories(arrayMove(categories, index, newIndex))
    setHasUnsavedChanges(true)
  }

  // Reordenação de Combos no Grid 2D
  const handleDragEndCombos = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = combos.findIndex((c) => c.id === active.id)
    const newIndex = combos.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    setCombos(arrayMove(combos, oldIndex, newIndex))
    setHasUnsavedChanges(true)
  }

  // Reordenação de Produtos dentro de uma Categoria no Grid 2D
  const handleDragEndProductsForCategory = (
    categoryId: string | null,
    event: DragEndEvent
  ) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const categoryProducts = products.filter((p) =>
      categoryId ? p.category_id === categoryId : !p.category_id
    )

    const oldIndex = categoryProducts.findIndex((p) => p.id === active.id)
    const newIndex = categoryProducts.findIndex((p) => p.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedCategoryProducts = arrayMove(
      categoryProducts,
      oldIndex,
      newIndex
    )

    setProducts((prev) => {
      const otherProducts = prev.filter((p) =>
        categoryId ? p.category_id !== categoryId : Boolean(p.category_id)
      )
      return [...otherProducts, ...reorderedCategoryProducts]
    })
    setHasUnsavedChanges(true)
  }

  // Reordenação de Produtos por setas táteis (▲ / ▼) para mobile
  const handleMoveProduct = (
    categoryId: string | null,
    productId: string,
    direction: -1 | 1
  ) => {
    const categoryProducts = products.filter((p) =>
      categoryId ? p.category_id === categoryId : !p.category_id
    )
    const currentIndex = categoryProducts.findIndex((p) => p.id === productId)
    if (currentIndex === -1) return
    const newIndex = currentIndex + direction
    if (newIndex < 0 || newIndex >= categoryProducts.length) return

    const reordered = arrayMove(categoryProducts, currentIndex, newIndex)
    setProducts((prev) => {
      const otherProducts = prev.filter((p) =>
        categoryId ? p.category_id !== categoryId : Boolean(p.category_id)
      )
      return [...otherProducts, ...reordered]
    })
    setHasUnsavedChanges(true)
  }

  // Reordenação de Combos por setas táteis (▲ / ▼) para mobile
  const handleMoveCombo = (comboId: string, direction: -1 | 1) => {
    const currentIndex = combos.findIndex((c) => c.id === comboId)
    if (currentIndex === -1) return
    const newIndex = currentIndex + direction
    if (newIndex < 0 || newIndex >= combos.length) return

    setCombos(arrayMove(combos, currentIndex, newIndex))
    setHasUnsavedChanges(true)
  }

  // Descartar todas as alterações não salvas (restaura para o baseline)
  const handleDiscardChanges = () => {
    setSectionsOrder(savedBaseline.sectionsOrder)
    setCategories(savedBaseline.categories)
    setProducts(savedBaseline.products)
    setCombos(savedBaseline.combos)
    setTheme(savedBaseline.theme)
    setBannerUrl(savedBaseline.bannerUrl)
    setLogoUrl(savedBaseline.logoUrl)
    setHasUnsavedChanges(false)
    showFeedback(
      'success',
      'Alterações descartadas. A vitrine voltou ao estado anterior.'
    )
  }

  // Salvar todas as alterações em 1 única requisição HTTP consolidada
  const handleSaveAllChanges = () => {
    startTransition(async () => {
      const payload: SaveAllStorefrontPayload = {
        sectionsOrder,
        categories: createReorderPayload(categories),
        products: createReorderPayload(products),
        combos: createReorderPayload(combos),
        theme,
        banner_url: bannerUrl || null,
        logo_url: logoUrl || null,
      }

      const res = await saveAllStorefrontChangesAction(payload)
      if (res.success) {
        setSavedBaseline({
          sectionsOrder,
          categories,
          products,
          combos,
          theme,
          bannerUrl,
          logoUrl,
        })
        setHasUnsavedChanges(false)
        showFeedback('success', 'Vitrine salva e publicada com sucesso!')
      } else {
        showFeedback('error', res.message)
      }
    })
  }

  // Filtragem de produtos por modalidade na vitrine
  const filterByModality = (p: ProductWithCategory) => {
    if (activeModality === 'all') return true
    return isProductAvailableInModality(p, activeModality)
  }

  const filterCombosByModality = (c: ComboWithRules) => {
    if (activeModality === 'all') return true
    return (c.sale_type || 'order') === activeModality
  }

  // Produtos sem categoria
  const uncategorizedProducts = useMemo(() => {
    return products.filter(
      (p) =>
        (!p.category_id || !categories.some((c) => c.id === p.category_id)) &&
        filterByModality(p)
    )
  }, [products, categories, activeModality])

  return (
    <div className="space-y-6 pb-28 sm:pb-24">
      {/* Dynamic Font Injection da Google Fonts para renderização 100% fiel */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${selectedFont.googleFamily}&display=swap`}
      />

      {/* ============================================================== */}
      {/* NAVEGAÇÃO DE ABAS SEGMENTADAS (APARÊNCIA VS ORGANIZAR) */}
      {/* ============================================================== */}
      <div className="flex items-center gap-2 p-1.5 bg-white border border-neutral-200/90 rounded-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex-1 min-h-[44px] cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Palette className="size-4 shrink-0" />
          <span>Aparência</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('organize')}
          className={`flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex-1 min-h-[44px] cursor-pointer ${
            activeTab === 'organize'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Layers className="size-4 shrink-0" />
          <span>Organizar</span>
        </button>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 p-3.5 rounded-xl text-xs sm:text-sm font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
              : 'bg-rose-50 text-rose-800 border-rose-200 shadow-2xs'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-4 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="size-4 shrink-0 text-rose-700" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: APARÊNCIA & IDENTIDADE VISUAL */}
      {/* ============================================================== */}
      {activeTab === 'appearance' && (
        <StoreAppearanceTab
          storeName={store.name}
          description={store.description || ''}
          logoUrl={logoUrl}
          onLogoChange={handleLogoChange}
          bannerUrl={bannerUrl}
          onBannerChange={handleBannerChange}
          whatsappNumber={store.whatsapp_number}
          theme={theme}
          onThemeChange={handleThemeChange}
        />
      )}

      {/* ============================================================== */}
      {/* ABA 2: ORGANIZAR VITRINE */}
      {/* ============================================================== */}
      {activeTab === 'organize' && (
        <div className="space-y-6">
          {/* BARRA SUPERIOR DE CONTROLE DO MODO DE ORGANIZAÇÃO */}
          <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/90 shadow-md flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="size-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Layers className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-neutral-900">
                Organizador Visual ao Vivo
              </h2>
              {hasUnsavedChanges ? (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Rascunho Aberto
                </span>
              ) : (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Vitrine Idêntica
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              Arraste os produtos no grid e reordene seções. Quando estiver satisfeito, salve as alterações de uma vez só.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end flex-wrap">
          {/* Alternador de Modo de Dispositivo: Mobile vs Desktop */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'desktop'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Monitor className="size-3.5" />
              <span>Desktop</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Smartphone className="size-3.5" />
              <span>Celular (390px)</span>
            </button>
          </div>

          {/* Filtro de Modalidade (Para ver como fica em cada aba) */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-xl border border-neutral-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveModality('all')}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModality === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Todos os Itens
            </button>
            <button
              type="button"
              onClick={() => setActiveModality('ready_delivery')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModality === 'ready_delivery'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Zap className="size-3 text-amber-500" />
              <span>Pronta-entrega</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModality('order')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeModality === 'order'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Calendar className="size-3 text-purple-500" />
              <span>Encomendas</span>
            </button>
          </div>

          {/* Feedback & Status */}
          {isPending ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-xs font-medium">
              <Loader2 className="size-3.5 animate-spin text-neutral-900" />
              <span>Publicando vitrine...</span>
            </div>
          ) : feedback ? (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <Check className="size-3.5 text-emerald-600" />
              ) : (
                <AlertCircle className="size-3.5 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          ) : hasUnsavedChanges ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-semibold">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Alterações pendentes</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 text-neutral-600 border border-neutral-200/80 text-xs font-medium">
              <Check className="size-3.5 text-emerald-600" />
              <span>Vitrine publicada</span>
            </div>
          )}

          {store.slug && (
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors border border-neutral-200 cursor-pointer"
            >
              <span>Ver Vitrine Oficial</span>
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* ÁREA DA VITRINE: DESKTOP OU MOLDURA DE CELULAR (MOBILE-FIRST) */}
      {/* ============================================================== */}
      <div className={viewMode === 'mobile' ? 'flex justify-center py-4' : 'w-full'}>
        <div
          className={
            viewMode === 'mobile'
              ? 'w-full max-w-[420px] rounded-[48px] p-3 bg-neutral-900 shadow-2xl ring-1 ring-neutral-800 border-4 border-neutral-800'
              : 'w-full'
          }
        >
          {viewMode === 'mobile' && (
            <div className="h-6 bg-neutral-900 flex items-center justify-center mb-1">
              <div className="w-24 h-3.5 bg-black rounded-full" />
            </div>
          )}

          {/* Contêiner da Vitrine com Estilos e Cores da Loja */}
          <div
            className={`transition-colors overflow-hidden ${
              viewMode === 'mobile'
                ? 'rounded-[36px] max-h-[85vh] overflow-y-auto border border-neutral-800'
                : 'rounded-2xl border border-neutral-200/80 shadow-sm max-w-6xl mx-auto'
            }`}
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
            {/* Header da Loja (Visual Idêntico à Vitrine Pública) */}
            <header className="relative">
              {bannerUrl ? (
                <div className="relative w-full aspect-[3/1] sm:aspect-[4/1] bg-neutral-100 rounded-b-2xl overflow-hidden">
                  <Image
                    src={bannerUrl}
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
                    backgroundColor: theme.primary_color,
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
                      backgroundColor: logoUrl ? '#ffffff' : theme.primary_color,
                    }}
                  >
                    {logoUrl ? (
                      <Image
                        src={logoUrl}
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
                    {/* Badge de Horário de Funcionamento */}
                    <div
                      suppressHydrationWarning
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        openStatus.isOpen
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full shrink-0 ${
                          openStatus.isOpen
                            ? 'bg-emerald-600 animate-pulse'
                            : 'bg-rose-600'
                        }`}
                      />
                      <span>
                        {viewMode === 'mobile'
                          ? openStatus.isOpen
                            ? 'Aberto agora'
                            : 'Fechado agora'
                          : openStatus.isOpen
                          ? openStatus.todaySchedule?.open &&
                            openStatus.todaySchedule?.close
                            ? `Aberto agora • ${openStatus.todaySchedule.open} às ${openStatus.todaySchedule.close}`
                            : 'Aberto agora'
                          : 'Fechado agora'}
                      </span>
                      <Clock className="size-3.5 opacity-60 ml-0.5 shrink-0" />
                    </div>

                    {store.whatsapp_number && (
                      <div className="h-9 px-3.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1.5 text-xs font-semibold border border-emerald-200">
                        <MessageCircle className="size-4" />
                        <span>WhatsApp</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informações da Loja: Nome e Descrição */}
                <div className="space-y-1">
                  <h1
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight"
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

                {/* Card de Retirada */}
                {pickupAddress && pickupAddress.street && (
                  <div className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50/90 border border-neutral-200/90 text-left shadow-2xs">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="size-9 rounded-lg bg-white border border-neutral-200/90 flex items-center justify-center shrink-0 shadow-2xs text-neutral-800 mt-0.5">
                        <MapPin className="size-4.5 text-neutral-800" />
                      </div>
                      <div className="min-w-0 space-y-0.5 flex-1">
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
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra Informativa Minimalista */}
              <div className="bg-neutral-50/80 px-4 sm:px-6 lg:px-8 py-2.5 border-b border-neutral-200/80 text-xs text-neutral-600 flex items-center justify-center gap-2 text-center leading-relaxed">
                <span>⚡ <strong>Pronta-entrega:</strong> disponível no horário</span>
                <span className="text-neutral-300">|</span>
                <span>📅 <strong>Encomendas:</strong> aceitas 24h</span>
              </div>
            </header>

            {/* Corpo da Vitrine Organizada */}
            <div className="p-4 sm:p-6 lg:p-8 space-y-12">
              {sectionsOrder.map((sectionKey, sectionIndex) => {
                // ==============================================================
                // SEÇÃO 1: DROPS (FORNADAS & PRÉ-VENDAS)
                // ==============================================================
                if (sectionKey === 'drops') {
                  return (
                    <section
                      key="section-drops"
                      className="space-y-4 rounded-2xl p-3 sm:p-4 border-2 border-dashed border-neutral-300/80 bg-neutral-50/40 relative"
                    >
                      {/* Barra de Controle da Seção */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 text-white shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="size-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold font-mono text-white">
                            #{sectionIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <Flame className="size-4 text-amber-400" />
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                              Seção: Fornadas & Pré-Vendas (Drops)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === 0}
                            onClick={() => handleMoveSection(sectionIndex, -1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowUp className="size-3" /> Subir Seção
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === sectionsOrder.length - 1}
                            onClick={() => handleMoveSection(sectionIndex, 1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowDown className="size-3" /> Descer Seção
                          </Button>
                        </div>
                      </div>

                      {/* Exibição Fiel dos Drops Ativos */}
                      {activeDrops.length === 0 ? (
                        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 text-center space-y-1.5">
                          <Flame className="size-8 text-neutral-300 mx-auto" />
                          <p className="text-xs font-semibold text-neutral-800">
                            Nenhum Drop ou Fornada ativa no momento.
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            Quando você ativar uma pré-venda em &quot;Drops & Fornadas&quot;, ela aparecerá nesta exata posição da vitrine.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {activeDrops.map((drop) => (
                            <div
                              key={drop.id}
                              className="rounded-2xl bg-white border border-neutral-200/80 shadow-xs overflow-hidden space-y-4"
                            >
                              <div className="bg-neutral-50/70 p-4 border-b border-neutral-200/80 space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex size-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                      <span className="relative inline-flex rounded-full size-2 bg-emerald-600" />
                                    </span>
                                    <h3 className="text-sm sm:text-base font-semibold text-neutral-900">
                                      {drop.title}
                                    </h3>
                                  </div>
                                  <span className="text-xs font-mono font-medium text-neutral-700 bg-white px-2.5 py-1 rounded-md border border-neutral-200">
                                    Pré-venda ativa
                                  </span>
                                </div>
                                {drop.description && (
                                  <p className="text-xs text-neutral-600">
                                    {drop.description}
                                  </p>
                                )}
                              </div>

                              <div className="p-4 pt-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {drop.items.map((item) => {
                                    const product = item.product
                                    if (!product) return null
                                    return (
                                      <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-xl border border-neutral-200/80 bg-neutral-50/40 gap-3"
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
                                            <span className="text-xs font-semibold text-neutral-900 font-mono">
                                              {formatCurrency(
                                                item.custom_price ?? product.price
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <span className="text-[10px] px-2 py-1 rounded-md bg-white border border-neutral-200 text-neutral-600 font-medium">
                                          {item.allocated_quantity} un
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                }

                // ==============================================================
                // SEÇÃO 2: COMBOS (CAIXAS & KITS)
                // ==============================================================
                if (sectionKey === 'combos') {
                  const visibleCombos = combos.filter(filterCombosByModality)

                  return (
                    <section
                      key="section-combos"
                      className="space-y-4 rounded-2xl p-3 sm:p-4 border-2 border-dashed border-neutral-300/80 bg-neutral-50/40 relative"
                    >
                      {/* Barra de Controle da Seção */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 text-white shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="size-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold font-mono text-white">
                            #{sectionIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <Boxes className="size-4 text-purple-400" />
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                              Seção: Combos & Kits ({combos.length} cadastrados)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === 0}
                            onClick={() => handleMoveSection(sectionIndex, -1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowUp className="size-3" /> Subir Seção
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === sectionsOrder.length - 1}
                            onClick={() => handleMoveSection(sectionIndex, 1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowDown className="size-3" /> Descer Seção
                          </Button>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-500 px-1">
                        💡 <strong>Dica:</strong> Arraste os cards de combos no grid abaixo para definir a sequência. Suas alterações ficam como rascunho até que você clique em &quot;Salvar Alterações&quot;.
                      </p>

                      {visibleCombos.length === 0 ? (
                        <div className="bg-white border border-neutral-200/80 rounded-2xl p-6 text-center space-y-1.5">
                          <Boxes className="size-8 text-neutral-300 mx-auto" />
                          <p className="text-xs font-semibold text-neutral-800">
                            Nenhum combo cadastrado nesta modalidade.
                          </p>
                        </div>
                      ) : (
                        <DndContext
                          id="dnd-context-combos"
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEndCombos}
                        >
                          <SortableContext
                            items={visibleCombos.map((c) => c.id)}
                            strategy={rectSortingStrategy}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center items-stretch">
                              {visibleCombos.map((combo, index) => (
                                <SortableComboCard
                                  key={combo.id}
                                  combo={combo}
                                  position={index + 1}
                                  totalCount={visibleCombos.length}
                                  onMove={(direction) =>
                                    handleMoveCombo(combo.id, direction)
                                  }
                                  primaryColor={theme.primary_color}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}
                    </section>
                  )
                }

                // ==============================================================
                // SEÇÃO 3: CATEGORIAS & PRODUTOS
                // ==============================================================
                if (sectionKey === 'categories') {
                  return (
                    <section
                      key="section-categories"
                      className="space-y-6 rounded-2xl p-3 sm:p-4 border-2 border-dashed border-neutral-300/80 bg-neutral-50/40 relative"
                    >
                      {/* Barra de Controle da Seção */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-neutral-900 text-white shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="size-6 rounded-md bg-white/20 flex items-center justify-center text-xs font-bold font-mono text-white">
                            #{sectionIndex + 1}
                          </span>
                          <div className="flex items-center gap-2">
                            <FolderTree className="size-4 text-emerald-400" />
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                              Seção: Categorias de Produtos ({categories.length} categorias)
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === 0}
                            onClick={() => handleMoveSection(sectionIndex, -1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowUp className="size-3" /> Subir Seção
                          </Button>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={sectionIndex === sectionsOrder.length - 1}
                            onClick={() => handleMoveSection(sectionIndex, 1)}
                            className="h-7 text-xs px-2 text-white hover:bg-white/20 gap-1 cursor-pointer"
                          >
                            <ArrowDown className="size-3" /> Descer Seção
                          </Button>
                        </div>
                      </div>

                      {categories.length === 0 && uncategorizedProducts.length === 0 ? (
                        <div className="bg-white border border-neutral-200/80 rounded-2xl p-8 text-center space-y-1.5">
                          <FolderTree className="size-8 text-neutral-300 mx-auto" />
                          <p className="text-xs font-semibold text-neutral-800">
                            Nenhuma categoria ou produto cadastrado.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-10">
                          {/* Lista das Categorias Organizadas */}
                          {categories.map((category, catIndex) => {
                            const categoryProducts = products
                              .filter((p) => p.category_id === category.id)
                              .filter(filterByModality)

                            return (
                              <div
                                key={category.id}
                                className="space-y-4 bg-white/60 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs"
                              >
                                {/* Header da Categoria com Controles Up/Down */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/80">
                                  <div className="flex items-center gap-3">
                                    <div className="size-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold font-mono shrink-0 shadow-2xs">
                                      #{catIndex + 1}
                                    </div>
                                    <div className="space-y-0.5">
                                      <div className="flex items-center gap-2">
                                        <FolderTree className="size-4 text-neutral-700" />
                                        <h3
                                          className="text-base sm:text-lg font-bold uppercase tracking-wider"
                                          style={{
                                            color: theme.text_color,
                                            fontWeight: fontWeights.headingWeight,
                                          }}
                                        >
                                          {category.name}
                                        </h3>
                                        <span className="text-xs text-neutral-500 font-medium font-mono">
                                          ({categoryProducts.length}{' '}
                                          {categoryProducts.length === 1
                                            ? 'item'
                                            : 'itens'}
                                          )
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-neutral-500">
                                        Arraste os cards de produtos abaixo para mudar a ordem. O 1º produto recebe destaque máximo.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      disabled={catIndex === 0}
                                      onClick={() => handleMoveCategory(catIndex, -1)}
                                      className="h-7 text-xs px-2 gap-1 bg-white hover:bg-neutral-50 cursor-pointer"
                                      title="Mover categoria para cima"
                                    >
                                      <ArrowUp className="size-3" /> Subir Categoria
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      disabled={catIndex === categories.length - 1}
                                      onClick={() => handleMoveCategory(catIndex, 1)}
                                      className="h-7 text-xs px-2 gap-1 bg-white hover:bg-neutral-50 cursor-pointer"
                                      title="Mover categoria para baixo"
                                    >
                                      <ArrowDown className="size-3" /> Descer Categoria
                                    </Button>
                                  </div>
                                </div>

                                {/* Grid 2D Drag-and-Drop de Produtos desta Categoria */}
                                {categoryProducts.length === 0 ? (
                                  <div className="p-6 text-center border border-dashed border-neutral-200 rounded-xl bg-neutral-50/60">
                                    <p className="text-xs text-neutral-500">
                                      Nenhum produto cadastrado nesta categoria ou compatível com o filtro selecionado.
                                    </p>
                                  </div>
                                ) : (
                                  <DndContext
                                    id={`dnd-context-category-${category.id}`}
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(e) =>
                                      handleDragEndProductsForCategory(
                                        category.id,
                                        e
                                      )
                                    }
                                  >
                                    <SortableContext
                                      items={categoryProducts.map((p) => p.id)}
                                      strategy={rectSortingStrategy}
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center items-stretch">
                                        {categoryProducts.map(
                                          (product, productIndex) => (
                                            <SortableProductCard
                                              key={product.id}
                                              product={product}
                                              position={productIndex + 1}
                                              totalCount={categoryProducts.length}
                                              onMove={(direction) =>
                                                handleMoveProduct(
                                                  category.id,
                                                  product.id,
                                                  direction
                                                )
                                              }
                                              modality={
                                                activeModality === 'order'
                                                  ? 'order'
                                                  : 'ready_delivery'
                                              }
                                              themeCardColor={theme.card_color}
                                              themeTextColor={theme.text_color}
                                              themePrimaryColor={theme.primary_color}
                                            />
                                          )
                                        )}
                                      </div>
                                    </SortableContext>
                                  </DndContext>
                                )}
                              </div>
                            )
                          })}

                          {/* Itens Sem Categoria (se houver) */}
                          {uncategorizedProducts.length > 0 && (
                            <div className="space-y-4 bg-white/60 p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
                              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
                                <div className="flex items-center gap-2">
                                  <FolderTree className="size-4 text-neutral-700" />
                                  <h3 className="text-base font-bold uppercase tracking-wider text-neutral-900">
                                    Sem Categoria / Geral
                                  </h3>
                                  <span className="text-xs text-neutral-500 font-mono">
                                    ({uncategorizedProducts.length} itens)
                                  </span>
                                </div>
                              </div>

                              <DndContext
                                id="dnd-context-category-uncategorized"
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={(e) =>
                                  handleDragEndProductsForCategory(null, e)
                                }
                              >
                                <SortableContext
                                  items={uncategorizedProducts.map((p) => p.id)}
                                  strategy={rectSortingStrategy}
                                >
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-center items-stretch">
                                    {uncategorizedProducts.map(
                                      (product, productIndex) => (
                                        <SortableProductCard
                                          key={product.id}
                                          product={product}
                                          position={productIndex + 1}
                                          totalCount={uncategorizedProducts.length}
                                          onMove={(direction) =>
                                            handleMoveProduct(
                                              null,
                                              product.id,
                                              direction
                                            )
                                          }
                                          modality={
                                            activeModality === 'order'
                                              ? 'order'
                                              : 'ready_delivery'
                                          }
                                          themeCardColor={theme.card_color}
                                          themeTextColor={theme.text_color}
                                          themePrimaryColor={theme.primary_color}
                                        />
                                      )
                                    )}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            </div>
                          )}
                        </div>
                      )}
                    </section>
                  )
                }

                return null
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* ============================================================== */}
      {/* BARRA FIXA INFERIOR DE SALVAMENTO (STICKY BOTTOM BAR - MOBILE THUMB ZONE) */}
      {/* Só aparece quando há alterações não salvas (ou durante o salvamento) */}
      {/* No mobile, fica posicionada exatamente ACIMA da navbar mobile */}
      {/* ============================================================== */}
      {(hasUnsavedChanges || isPending) && (
        <div
          className="fixed inset-x-0 z-50 bg-white/98 backdrop-blur-md border-t border-neutral-200/90 shadow-xl px-3 py-2 sm:px-8 sm:py-3 animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: 'var(--admin-storefront-save-bottom, 3.75rem)',
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
            {/* Status à esquerda */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300/80 px-2 py-1 sm:px-2.5 sm:py-1 rounded-full shadow-2xs">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-amber-500" />
                </span>
                <span className="hidden sm:inline">Alterações não salvas</span>
                <span className="sm:hidden">Não salvo</span>
              </span>

              {/* No desktop/tablet, link rápido para ver a loja */}
              {store.slug && (
                <Link
                  href={`/${store.slug}`}
                  target="_blank"
                  className="hidden lg:flex text-xs font-semibold text-neutral-700 hover:text-neutral-900 items-center gap-1 ml-2"
                >
                  <span>Ver Loja</span>
                  <ExternalLink className="size-3" />
                </Link>
              )}
            </div>

            {/* Botões de Ação à direita */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={isPending}
                className="h-8 sm:h-10 px-2.5 sm:px-3.5 text-xs text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100 border-neutral-200 cursor-pointer"
              >
                <RotateCcw className="size-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Descartar</span>
              </Button>

              {store.slug && (
                <Link
                  href={`/${store.slug}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-10 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg shadow-2xs transition-colors"
                >
                  <span>Ver Vitrine Oficial</span>
                  <ExternalLink className="size-3.5" />
                </Link>
              )}

              <Button
                type="button"
                onClick={handleSaveAllChanges}
                disabled={isPending}
                className="h-8 sm:h-10 px-3 sm:px-5 text-xs font-semibold shadow-xs transition-all cursor-pointer bg-neutral-900 hover:bg-neutral-800 text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5 mr-1 sm:mr-1.5" />
                    <span>Salvar<span className="hidden sm:inline"> Vitrine</span></span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==============================================================
// COMPONENTE SORTABLE: CARD DE PRODUTO IDÊNTICO À VITRINE
// ==============================================================
interface SortableProductCardProps {
  product: ProductWithCategory
  position: number
  totalCount?: number
  onMove?: (direction: -1 | 1) => void
  modality: 'ready_delivery' | 'order'
  themeCardColor: string
  themeTextColor: string
  themePrimaryColor: string
}

function SortableProductCard({
  product,
  position,
  totalCount,
  onMove,
  modality,
}: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  }

  const isHighlight = position === 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl transition-all flex flex-col group ${
        isDragging
          ? 'shadow-2xl ring-2 ring-neutral-900 ring-offset-2 scale-102'
          : 'hover:shadow-md'
      }`}
    >
      {/* Barra de Arraste Superior com Identificação de Destaque e Setas Mobile */}
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-t-2xl border-t border-x cursor-grab active:cursor-grabbing select-none text-xs font-semibold transition-all ${
          isHighlight
            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
            : 'bg-neutral-900 text-white border-neutral-900/90'
        }`}
        title="Clique e arraste para mudar a posição ou use as setas para mover no celular"
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="size-3.5 shrink-0 opacity-80" />
          <span>
            {isHighlight ? '⭐ #1 Destaque' : `#${position}`}
          </span>
        </div>

        {/* Setas Táteis de Apoio (Ideais para celular) */}
        <div className="flex items-center gap-1">
          {onMove && (
            <div className="flex items-center gap-0.5 bg-black/25 rounded-md p-0.5">
              <button
                type="button"
                disabled={position <= 1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(-1)
                }}
                className="size-5 rounded flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                title="Mover produto para trás"
                aria-label="Mover produto para trás"
              >
                <ArrowUp className="size-3 text-white" />
              </button>
              <button
                type="button"
                disabled={totalCount !== undefined ? position >= totalCount : false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(1)
                }}
                className="size-5 rounded flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                title="Mover produto para frente"
                aria-label="Mover produto para frente"
              >
                <ArrowDown className="size-3 text-white" />
              </button>
            </div>
          )}
          <span className="text-[10px] font-normal opacity-80 hidden sm:inline ml-1">
            Arraste
          </span>
        </div>
      </div>

      {/* Renderização Visual 100% Fiel do Card do Produto */}
      <div className="flex-1 pointer-events-none rounded-b-2xl overflow-hidden border-b border-x border-neutral-200/80 bg-white shadow-2xs">
        <ProductCard
          product={product}
          currentModality={modality}
          cartQuantity={0}
          onAddToCart={() => {}}
          onRemoveFromCart={() => {}}
          isLocked={false}
        />
      </div>
    </div>
  )
}

// ==============================================================
// COMPONENTE SORTABLE: CARD DE COMBO IDÊNTICO À VITRINE
// ==============================================================
interface SortableComboCardProps {
  combo: ComboWithRules
  position: number
  totalCount?: number
  onMove?: (direction: -1 | 1) => void
  primaryColor: string
}

function SortableComboCard({
  combo,
  position,
  totalCount,
  onMove,
  primaryColor,
}: SortableComboCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: combo.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  }

  const isHighlight = position === 1

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative rounded-2xl transition-all flex flex-col group ${
        isDragging
          ? 'shadow-2xl ring-2 ring-neutral-900 ring-offset-2 scale-102'
          : 'hover:shadow-md'
      }`}
    >
      {/* Barra de Arraste Superior com Posição do Combo e Setas Mobile */}
      <div
        {...attributes}
        {...listeners}
        suppressHydrationWarning
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-t-2xl border-t border-x cursor-grab active:cursor-grabbing select-none text-xs font-semibold transition-all ${
          isHighlight
            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
            : 'bg-neutral-900 text-white border-neutral-900/90'
        }`}
        title="Clique e arraste ou use as setas para mover este combo"
      >
        <div className="flex items-center gap-1.5">
          <GripVertical className="size-3.5 shrink-0 opacity-80" />
          <span>{isHighlight ? '⭐ #1 Principal' : `Combo #${position}`}</span>
        </div>

        {/* Setas Táteis de Apoio */}
        <div className="flex items-center gap-1">
          {onMove && (
            <div className="flex items-center gap-0.5 bg-black/25 rounded-md p-0.5">
              <button
                type="button"
                disabled={position <= 1}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(-1)
                }}
                className="size-5 rounded flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                title="Mover combo para trás"
                aria-label="Mover combo para trás"
              >
                <ArrowUp className="size-3 text-white" />
              </button>
              <button
                type="button"
                disabled={totalCount !== undefined ? position >= totalCount : false}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onMove(1)
                }}
                className="size-5 rounded flex items-center justify-center hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                title="Mover combo para frente"
                aria-label="Mover combo para frente"
              >
                <ArrowDown className="size-3 text-white" />
              </button>
            </div>
          )}
          <span className="text-[10px] font-normal opacity-80 hidden sm:inline ml-1">
            Arraste
          </span>
        </div>
      </div>

      {/* Renderização Visual Fiel do Card de Combo */}
      <div className="group rounded-b-2xl overflow-hidden bg-white border-b border-x border-neutral-200/80 shadow-2xs flex flex-col justify-between w-full h-full pointer-events-none">
        <div>
          {combo.image_url ? (
            <div className="relative w-full aspect-[16/10] bg-neutral-100 overflow-hidden select-none">
              <Image
                src={combo.image_url}
                alt={combo.name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
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
              <h3 className="font-bold text-lg sm:text-xl text-neutral-900 leading-snug">
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
            <span className="text-xl sm:text-2xl font-bold text-neutral-900 font-mono tabular-nums">
              {formatCurrency(combo.price)}
            </span>
            <Button
              size="sm"
              style={{ backgroundColor: primaryColor }}
              className="text-white shadow-xs"
            >
              <Sparkles className="size-3.5 mr-1" /> Montar Caixa
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
