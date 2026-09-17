import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import type {
  Drop,
  DropFormInput,
  DropItemInput,
  DropStatus,
  DropUpdate,
  DropWithItems,
} from '@/lib/domain/drops'

/**
 * Lista todos os drops de uma loja com seus respectivos itens e produtos vinculados.
 */
export async function listDropsByStore(
  explicitStoreId?: string,
  onlyActive = false
): Promise<DropWithItems[]> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) return []
    storeId = store.id
  }

  let query = supabase
    .from('drops')
    .select(`
      *,
      items:drop_items(
        *,
        product:products(*)
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (onlyActive) {
    query = query.eq('is_active', true).eq('status', 'active')
  }

  const { data, error } = await query

  if (error) {
    console.error('[lib/db/drops.ts] Erro ao listar drops:', error)
    throw new Error(`Erro ao listar drops: ${error.message}`)
  }

  const list = (data as unknown as DropWithItems[]) ?? []
  if (onlyActive) {
    const now = Date.now()
    return list.filter(
      (drop) => !drop.ends_at || new Date(drop.ends_at).getTime() >= now
    )
  }

  return list
}

/**
 * Busca os detalhes completos de um Drop específico com seus itens e produtos.
 */
export async function getDropById(dropId: string): Promise<DropWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drops')
    .select(`
      *,
      items:drop_items(
        *,
        product:products(*)
      )
    `)
    .eq('id', dropId)
    .maybeSingle()

  if (error) {
    console.error('[lib/db/drops.ts] Erro ao buscar drop por ID:', error)
    throw new Error(`Erro ao buscar drop: ${error.message}`)
  }

  return (data as unknown as DropWithItems) ?? null
}

/**
 * Cria um novo Drop e vincula os produtos selecionados com seus respectivos estoques alocados.
 */
export async function createDrop(
  input: DropFormInput,
  explicitStoreId?: string
): Promise<DropWithItems> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  // 1. Inserir o Drop principal
  const { data: newDrop, error: dropError } = await supabase
    .from('drops')
    .insert({
      store_id: storeId,
      title: input.title,
      slug: input.slug,
      description: input.description ?? null,
      banner_url: input.banner_url && input.banner_url.length > 0 ? input.banner_url : null,
      status: input.status ?? 'draft',
      starts_at: input.starts_at && input.starts_at.length > 0 ? input.starts_at : null,
      ends_at: input.ends_at && input.ends_at.length > 0 ? input.ends_at : null,
      max_orders: input.max_orders ?? null,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (dropError || !newDrop) {
    console.error('[lib/db/drops.ts] Erro ao criar drop:', dropError)
    throw new Error(`Erro ao criar drop: ${dropError?.message}`)
  }

  // 2. Inserir os drop_items com estoque alocado
  if (input.items && input.items.length > 0) {
    const itemsToInsert = input.items.map((item) => ({
      drop_id: newDrop.id,
      product_id: item.product_id,
      custom_price: item.custom_price ?? null,
      promotional_price: item.promotional_price ?? null,
      allocated_quantity: item.allocated_quantity,
      sold_quantity: 0,
      max_per_order: item.max_per_order ?? null,
      is_active: item.is_active ?? true,
    }))

    const { error: itemsError } = await supabase
      .from('drop_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('[lib/db/drops.ts] Erro ao vincular itens ao drop:', itemsError)
      throw new Error(`Erro ao vincular produtos ao drop: ${itemsError.message}`)
    }
  }

  const dropWithItems = await getDropById(newDrop.id)
  if (!dropWithItems) {
    throw new Error('Falha ao recuperar o drop recém-criado.')
  }

  return dropWithItems
}

/**
 * Atualiza metadados de um Drop e sincroniza seus itens da loja autenticada.
 */
export async function updateDrop(
  dropId: string,
  input: Partial<DropFormInput>,
  explicitStoreId?: string
): Promise<Drop> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const updatePayload: DropUpdate = {}

  if (input.title !== undefined) updatePayload.title = input.title
  if (input.slug !== undefined) updatePayload.slug = input.slug
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.banner_url !== undefined) updatePayload.banner_url = input.banner_url && input.banner_url.length > 0 ? input.banner_url : null
  if (input.status !== undefined) updatePayload.status = input.status
  if (input.starts_at !== undefined) updatePayload.starts_at = input.starts_at && input.starts_at.length > 0 ? input.starts_at : null
  if (input.ends_at !== undefined) updatePayload.ends_at = input.ends_at && input.ends_at.length > 0 ? input.ends_at : null
  if (input.max_orders !== undefined) updatePayload.max_orders = input.max_orders
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active

  const { data: updatedDrop, error: updateError } = await supabase
    .from('drops')
    .update(updatePayload)
    .eq('id', dropId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (updateError || !updatedDrop) {
    console.error('[lib/db/drops.ts] Erro ao atualizar drop:', updateError)
    throw new Error(`Erro ao atualizar drop: ${updateError?.message || 'Drop não encontrado ou não autorizado'}`)
  }

  // Se foram fornecidos novos itens, sincroniza
  if (input.items) {
    await setDropItems(dropId, input.items, storeId)
  }

  return updatedDrop
}

/**
 * Define ou atualiza os itens vinculados a um drop da loja autenticada.
 */
export async function setDropItems(
  dropId: string,
  items: DropItemInput[],
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

  // Verifica posse do drop
  const { data: drop, error: dropCheckError } = await supabase
    .from('drops')
    .select('id')
    .eq('id', dropId)
    .eq('store_id', storeId)
    .maybeSingle()

  if (dropCheckError || !drop) {
    throw new Error('Drop não encontrado ou não autorizado.')
  }

  // Remove itens antigos
  const { error: deleteError } = await supabase
    .from('drop_items')
    .delete()
    .eq('drop_id', dropId)

  if (deleteError) {
    console.error('[lib/db/drops.ts] Erro ao limpar itens antigos do drop:', deleteError)
    throw new Error(`Erro ao sincronizar itens do drop: ${deleteError.message}`)
  }

  if (items.length > 0) {
    const itemsToInsert = items.map((item) => ({
      drop_id: dropId,
      product_id: item.product_id,
      custom_price: item.custom_price ?? null,
      promotional_price: item.promotional_price ?? null,
      allocated_quantity: item.allocated_quantity,
      sold_quantity: 0,
      max_per_order: item.max_per_order ?? null,
      is_active: item.is_active ?? true,
    }))

    const { error: insertError } = await supabase
      .from('drop_items')
      .insert(itemsToInsert)

    if (insertError) {
      console.error('[lib/db/drops.ts] Erro ao inserir itens atualizados:', insertError)
      throw new Error(`Erro ao atualizar itens do drop: ${insertError.message}`)
    }
  }
}

/**
 * Atualiza rapidamente o status de um Drop (ex: de 'draft' para 'active' ou 'paused').
 */
export async function updateDropStatus(
  dropId: string,
  status: DropStatus,
  explicitStoreId?: string
): Promise<Drop> {
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
    .from('drops')
    .update({ status })
    .eq('id', dropId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error || !data) {
    console.error('[lib/db/drops.ts] Erro ao alterar status do drop:', error)
    throw new Error(`Erro ao alterar status do drop: ${error?.message || 'Drop não encontrado ou não autorizado'}`)
  }

  return data
}

/**
 * Exclui um Drop e todos os seus itens vinculados em cascata da loja autenticada.
 */
export async function deleteDrop(
  dropId: string,
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
    .from('drops')
    .delete()
    .eq('id', dropId)
    .eq('store_id', storeId)

  if (error) {
    console.error('[lib/db/drops.ts] Erro ao excluir drop:', error)
    throw new Error(`Erro ao excluir drop: ${error.message}`)
  }
}
