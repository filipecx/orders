import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import type {
  Product,
  ProductInput,
  ProductUpdate,
  ProductWithCategory,
  SaleType,
} from '@/lib/domain/products'

export interface ListProductsOptions {
  onlyActive?: boolean
  categoryId?: string
  saleType?: SaleType
}

/**
 * Lista produtos de uma loja (ou da loja do usuário autenticado se storeId for omitido).
 * Suporta filtros por atividade, categoria e tipo de venda (pronta-entrega ou encomenda).
 */
export async function listProductsByStore(
  explicitStoreId?: string,
  optionsOrOnlyActive: boolean | ListProductsOptions = false
): Promise<ProductWithCategory[]> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) return []
    storeId = store.id
  }

  const options: ListProductsOptions =
    typeof optionsOrOnlyActive === 'boolean'
      ? { onlyActive: optionsOrOnlyActive }
      : optionsOrOnlyActive

  let query = supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (options.onlyActive) {
    query = query.eq('is_active', true)
  }

  if (options.categoryId) {
    query = query.eq('category_id', options.categoryId)
  }

  if (options.saleType === 'ready_delivery') {
    query = query.eq('allow_ready_delivery', true)
  } else if (options.saleType === 'order') {
    query = query.eq('allow_order', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('[lib/db/products.ts] Erro ao listar produtos:', error)
    throw new Error(`Erro ao listar produtos: ${error.message}`)
  }

  return (data as unknown as ProductWithCategory[]) ?? []
}

/**
 * Busca um produto específico pelo ID com sua categoria associada.
 */
export async function getProductById(productId: string): Promise<ProductWithCategory | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', productId)
    .maybeSingle()

  if (error) {
    console.error('[lib/db/products.ts] Erro ao buscar produto por ID:', error)
    throw new Error(`Erro ao buscar produto: ${error.message}`)
  }

  return (data as unknown as ProductWithCategory) ?? null
}

/**
 * Cria um novo produto associando-o à loja do usuário autenticado.
 */
export async function createProduct(
  input: ProductInput,
  explicitStoreId?: string
): Promise<Product> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const allowReady = input.allow_ready_delivery ?? true
  const allowOrder = input.allow_order ?? false
  const computedSaleType =
    allowReady && allowOrder
      ? 'both'
      : allowOrder
      ? 'order'
      : 'ready_delivery'

  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      category_id: input.category_id ?? null,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      promotional_price: input.promotional_price ?? null,
      allow_ready_delivery: allowReady,
      allow_order: allowOrder,
      different_prices_by_mode: input.different_prices_by_mode ?? false,
      price_ready_delivery: input.different_prices_by_mode ? input.price_ready_delivery ?? null : null,
      price_order: input.different_prices_by_mode ? input.price_order ?? null : null,
      sale_type: computedSaleType,
      lead_time_days: input.lead_time_days ?? 0,
      image_url: input.image_url && input.image_url.length > 0 ? input.image_url : null,
      images: input.images ?? [],
      sku: input.sku ?? null,
      track_stock: input.track_stock ?? false,
      stock_quantity: input.stock_quantity ?? 0,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('[lib/db/products.ts] Erro ao criar produto:', error)
    throw new Error(`Erro ao criar produto: ${error.message}`)
  }

  return data
}

/**
 * Atualiza os dados de um produto existente da loja autenticada.
 */
export async function updateProduct(
  productId: string,
  input: Partial<ProductInput>,
  explicitStoreId?: string
): Promise<Product> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const updatePayload: ProductUpdate = {}

  if (input.name !== undefined) updatePayload.name = input.name
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.price !== undefined) updatePayload.price = input.price
  if (input.promotional_price !== undefined) updatePayload.promotional_price = input.promotional_price
  if (input.allow_ready_delivery !== undefined) updatePayload.allow_ready_delivery = input.allow_ready_delivery
  if (input.allow_order !== undefined) updatePayload.allow_order = input.allow_order
  if (input.different_prices_by_mode !== undefined) updatePayload.different_prices_by_mode = input.different_prices_by_mode
  if (input.price_ready_delivery !== undefined) updatePayload.price_ready_delivery = input.price_ready_delivery
  if (input.price_order !== undefined) updatePayload.price_order = input.price_order

  if (input.allow_ready_delivery !== undefined || input.allow_order !== undefined) {
    const allowReady = input.allow_ready_delivery ?? true
    const allowOrder = input.allow_order ?? false
    updatePayload.sale_type =
      allowReady && allowOrder
        ? 'both'
        : allowOrder
        ? 'order'
        : 'ready_delivery'
  } else if (input.sale_type !== undefined) {
    updatePayload.sale_type = input.sale_type
  }

  if (input.lead_time_days !== undefined) updatePayload.lead_time_days = input.lead_time_days
  if (input.image_url !== undefined) updatePayload.image_url = input.image_url && input.image_url.length > 0 ? input.image_url : null
  if (input.images !== undefined) updatePayload.images = input.images
  if (input.sku !== undefined) updatePayload.sku = input.sku
  if (input.track_stock !== undefined) updatePayload.track_stock = input.track_stock
  if (input.stock_quantity !== undefined) updatePayload.stock_quantity = input.stock_quantity
  if (input.sort_order !== undefined) updatePayload.sort_order = input.sort_order
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active
  if (input.category_id !== undefined) updatePayload.category_id = input.category_id

  const { data, error } = await supabase
    .from('products')
    .update(updatePayload)
    .eq('id', productId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) {
    console.error('[lib/db/products.ts] Erro ao atualizar produto:', error)
    throw new Error(`Erro ao atualizar produto: ${error.message}`)
  }

  return data
}

/**
 * Ativa ou desativa um produto rapidamente da loja autenticada.
 */
export async function toggleProductStatus(
  productId: string,
  isActive: boolean,
  explicitStoreId?: string
): Promise<Product> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const { data, error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error) {
    console.error('[lib/db/products.ts] Erro ao alterar status do produto:', error)
    throw new Error(`Erro ao alterar status do produto: ${error.message}`)
  }

  return data
}

/**
 * Remove um produto do catálogo da loja autenticada.
 */
export async function deleteProduct(
  productId: string,
  explicitStoreId?: string
): Promise<void> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .eq('store_id', storeId)

  if (error) {
    console.error('[lib/db/products.ts] Erro ao excluir produto:', error)
    throw new Error(`Erro ao excluir produto: ${error.message}`)
  }
}
