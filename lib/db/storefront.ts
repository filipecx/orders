import { createClient } from '@/lib/supabase/server'
import type { Store } from '@/lib/domain/stores'
import type { DropWithItems } from '@/lib/domain/drops'
import type { ProductWithCategory } from '@/lib/domain/products'
import type { Category } from '@/lib/domain/categories'
import type { ComboWithRules } from '@/lib/domain/combos'
import type { Faq } from '@/lib/domain/faqs'

export type StorefrontData = {
  store: Store
  categories: Category[]
  activeDrop: DropWithItems | null
  activeDrops: DropWithItems[]
  catalogProducts: ProductWithCategory[]
  combos: ComboWithRules[]
  faqs: Faq[]
}

/**
 * Busca os dados completos da vitrine da loja:
 * - Informações da Loja
 * - Categorias ativas
 * - Pré-vendas ativas com produtos e estoques
 * - Catálogo geral com produtos (pronta-entrega e encomendas)
 * - Combos e caixas promocionais com regras de seleção por categoria
 * - Perguntas Frequentes (FAQs) ordenadas
 */
export async function getStoreWithActiveDrop(
  slug: string
): Promise<StorefrontData | null> {
  const supabase = await createClient()

  // 1. Buscar a Loja ativa
  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (storeError || !store) {
    if (storeError) {
      console.error('[lib/db/storefront.ts] Erro ao buscar loja:', storeError)
    }
    return null
  }

  // 2. Executar buscas paralelas para performance máxima
  const [categoriesRes, dropsRes, productsRes, combosRes, faqsRes] = await Promise.all([
    // Categorias ativas da loja
    supabase
      .from('categories')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    // Pré-vendas ativas da loja
    supabase
      .from('drops')
      .select(`
        *,
        items:drop_items(
          *,
          product:products(*)
        )
      `)
      .eq('store_id', store.id)
      .eq('is_active', true)
      .eq('status', 'active')
      .order('created_at', { ascending: false }),

    // Catálogo geral de produtos ativos com dados de categoria
    supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('store_id', store.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),

    // Combos ativos com regras e categorias associadas
    supabase
      .from('combos')
      .select(`
        *,
        rules:combo_rules(
          *,
          category:categories(*)
        )
      `)
      .eq('store_id', store.id)
      .eq('active', true)
      .order('created_at', { ascending: false }),

    // Perguntas Frequentes (FAQs) da loja
    supabase
      .from('faqs')
      .select('*')
      .eq('store_id', store.id)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (categoriesRes.error) {
    console.error('[lib/db/storefront.ts] Erro ao buscar categorias:', categoriesRes.error)
  }
  if (dropsRes.error) {
    console.error('[lib/db/storefront.ts] Erro ao buscar pré-vendas:', dropsRes.error)
  }
  if (productsRes.error) {
    console.error('[lib/db/storefront.ts] Erro ao buscar catálogo:', productsRes.error)
  }
  if (combosRes.error) {
    console.error('[lib/db/storefront.ts] Erro ao buscar combos:', combosRes.error)
  }
  if (faqsRes.error) {
    if (faqsRes.error.code === 'PGRST205') {
      console.warn(
        '[lib/db/storefront.ts] Tabela public.faqs ainda não criada no Supabase. Execute a migration SQL.'
      )
    } else {
      console.error('[lib/db/storefront.ts] Erro ao buscar FAQs:', faqsRes.error)
    }
  }

  const now = Date.now()
  const allDrops = (dropsRes.data as unknown as DropWithItems[]) ?? []
  // Filtra apenas as que não expiraram (ends_at >= agora ou sem ends_at)
  const activeDrops = allDrops.filter(
    (drop) => !drop.ends_at || new Date(drop.ends_at).getTime() >= now
  )
  const activeDrop = activeDrops[0] ?? null

  const rawCombos = (combosRes.data as unknown as (ComboWithRules & { sort_order?: number | null })[]) ?? []
  const comboOrderMap = new Map<string, number>()
  const settingsCombosOrder = (store.settings as Record<string, unknown> | null)?.combos_order
  if (Array.isArray(settingsCombosOrder)) {
    settingsCombosOrder.forEach((id: unknown, idx: number) => {
      if (typeof id === 'string') {
        comboOrderMap.set(id, idx)
      }
    })
  }

  const sortedCombos = [...rawCombos].sort((a, b) => {
    if (comboOrderMap.size > 0) {
      const idxA = comboOrderMap.has(a.id) ? (comboOrderMap.get(a.id) as number) : 9999
      const idxB = comboOrderMap.has(b.id) ? (comboOrderMap.get(b.id) as number) : 9999
      if (idxA !== idxB) return idxA - idxB
    }
    const orderA = typeof a.sort_order === 'number' ? a.sort_order : 9999
    const orderB = typeof b.sort_order === 'number' ? b.sort_order : 9999
    if (orderA !== orderB) return orderA - orderB
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return {
    store: {
      ...store,
      owner_id: '',
      pix_key: null,
      pix_key_type: null,
      pix_merchant_city: null,
      pix_merchant_name: null,
    },
    categories: categoriesRes.data ?? [],
    activeDrop,
    activeDrops,
    catalogProducts: (productsRes.data as unknown as ProductWithCategory[]) ?? [],
    combos: sortedCombos,
    faqs: (faqsRes.data as unknown as Faq[]) ?? [],
  }
}
