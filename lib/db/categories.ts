import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import type { Category, CategoryInput, CategoryUpdate } from '@/lib/domain/categories'

/**
 * Lista todas as categorias de uma loja.
 */
export async function listCategoriesByStore(
  explicitStoreId?: string,
  onlyActive = false
): Promise<Category[]> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) return []
    storeId = store.id
  }

  try {
    let query = supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (onlyActive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error(
        '[lib/db/categories.ts] Erro ao listar categorias:',
        error.message || error.details || JSON.stringify(error)
      )
      return []
    }

    return data ?? []
  } catch (err) {
    console.error('[lib/db/categories.ts] Exceção ao listar categorias:', err)
    return []
  }
}

/**
 * Busca uma categoria específica pelo ID.
 */
export async function getCategoryById(categoryId: string): Promise<Category | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .maybeSingle()

    if (error) {
      console.error(
        '[lib/db/categories.ts] Erro ao buscar categoria por ID:',
        error.message || error.details || JSON.stringify(error)
      )
      return null
    }

    return data
  } catch (err) {
    console.error('[lib/db/categories.ts] Exceção ao buscar categoria:', err)
    return null
  }
}

/**
 * Cria uma nova categoria associando-a à loja especificada ou do usuário autenticado.
 */
export async function createCategory(
  input: CategoryInput,
  explicitStoreId?: string
): Promise<Category> {
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
    .from('categories')
    .insert({
      store_id: storeId,
      name: input.name,
      description: input.description ?? null,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('[lib/db/categories.ts] Erro ao criar categoria:', error?.message || error)
    throw new Error(`Erro ao criar categoria: ${error?.message || 'Verifique se a migration do banco foi executada.'}`)
  }

  return data
}

/**
 * Atualiza os dados de uma categoria existente da loja autenticada.
 */
export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryInput>,
  explicitStoreId?: string
): Promise<Category> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const updatePayload: CategoryUpdate = {}

  if (input.name !== undefined) updatePayload.name = input.name
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.sort_order !== undefined) updatePayload.sort_order = input.sort_order
  if (input.is_active !== undefined) updatePayload.is_active = input.is_active

  const { data, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', categoryId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error || !data) {
    console.error('[lib/db/categories.ts] Erro ao atualizar categoria:', error?.message || error)
    throw new Error(`Erro ao atualizar categoria: ${error?.message || 'Categoria não encontrada ou sem permissão'}`)
  }

  return data
}

/**
 * Remove uma categoria do banco de dados da loja autenticada.
 */
export async function deleteCategory(
  categoryId: string,
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
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('store_id', storeId)

  if (error) {
    console.error('[lib/db/categories.ts] Erro ao excluir categoria:', error?.message || error)
    throw new Error(`Erro ao excluir categoria: ${error?.message || 'Erro inesperado'}`)
  }
}
