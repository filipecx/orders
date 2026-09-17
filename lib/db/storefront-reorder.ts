import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database.types'
import {
  reorderPayloadSchema,
  reorderSectionsSchema,
  type ReorderItem,
  type StorefrontSectionKey,
} from '@/lib/domain/storefront-organization'
import { getStoreByOwner } from './stores'

/**
 * Detecta se o erro retornado pelo Supabase/PostgREST é de função RPC inexistente ou schema cache.
 */
function isRpcMissingError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    Boolean(error.message?.includes('schema cache')) ||
    Boolean(error.message?.includes('reorder_')) ||
    Boolean(error.message?.includes('does not exist'))
  )
}

/**
 * Reordena Categorias via RPC no Supabase com validação Zod e fallback.
 */
export async function reorderCategoriesDb(
  storeId: string,
  rawItems: ReorderItem[]
): Promise<{ success: boolean; count: number }> {
  // 1. Checklist de Segurança: Validar o payload no TypeScript com Zod antes de chamar a RPC
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    throw new Error(`Payload de reordenação inválido: ${validation.error.message}`)
  }
  const items = validation.data

  const supabase = await createClient()

  // 2. Garantir que o usuário atual é dono da loja
  const store = await getStoreByOwner()
  if (!store || store.id !== storeId) {
    throw new Error('Acesso não autorizado para esta loja.')
  }

  // 3. Chamar a RPC segura no Supabase
  const { error } = await supabase.rpc('reorder_categories', {
    p_store_id: storeId,
    p_items: items,
  })

  // 4. Fallback caso a RPC ainda não exista no Supabase (código PGRST202 / 42883)
  if (error) {
    if (isRpcMissingError(error)) {
      console.warn(
        '[lib/db/storefront-reorder.ts] RPC reorder_categories não encontrada. Executando fallback via UPDATEs diretos em paralelo...'
      )
      const results = await Promise.all(
        items.map((item) =>
          supabase
            .from('categories')
            .update({ sort_order: item.display_order })
            .eq('id', item.id)
            .eq('store_id', storeId)
        )
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) {
        console.error('[lib/db/storefront-reorder.ts] Erro no fallback de categorias:', failed.error)
        throw new Error(`Erro ao salvar ordem das categorias: ${failed.error.message}`)
      }
      return { success: true, count: items.length }
    }
    console.error('[lib/db/storefront-reorder.ts] Erro ao reordenar categorias:', error)
    throw new Error(`Erro ao reordenar categorias: ${error.message}`)
  }

  return { success: true, count: items.length }
}

/**
 * Reordena Produtos via RPC no Supabase com validação Zod e fallback.
 */
export async function reorderProductsDb(
  storeId: string,
  rawItems: ReorderItem[]
): Promise<{ success: boolean; count: number }> {
  // 1. Checklist de Segurança: Validar o payload no TypeScript com Zod antes de chamar a RPC
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    throw new Error(`Payload de reordenação de produtos inválido: ${validation.error.message}`)
  }
  const items = validation.data

  const supabase = await createClient()

  // 2. Validação multi-tenant
  const store = await getStoreByOwner()
  if (!store || store.id !== storeId) {
    throw new Error('Acesso não autorizado para esta loja.')
  }

  // 3. Chamar a RPC segura
  const { error } = await supabase.rpc('reorder_products', {
    p_store_id: storeId,
    p_items: items,
  })

  // 4. Fallback caso a RPC ainda não exista no Supabase
  if (error) {
    if (isRpcMissingError(error)) {
      console.warn(
        '[lib/db/storefront-reorder.ts] RPC reorder_products não encontrada. Executando fallback via UPDATEs diretos em paralelo...'
      )
      const results = await Promise.all(
        items.map((item) =>
          supabase
            .from('products')
            .update({ sort_order: item.display_order })
            .eq('id', item.id)
            .eq('store_id', storeId)
        )
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) {
        console.error('[lib/db/storefront-reorder.ts] Erro no fallback de produtos:', failed.error)
        throw new Error(`Erro ao salvar ordem dos produtos: ${failed.error.message}`)
      }
      return { success: true, count: items.length }
    }
    console.error('[lib/db/storefront-reorder.ts] Erro ao reordenar produtos:', error)
    throw new Error(`Erro ao reordenar produtos: ${error.message}`)
  }

  return { success: true, count: items.length }
}

/**
 * Reordena Combos via RPC no Supabase com validação Zod e fallback.
 */
export async function reorderCombosDb(
  storeId: string,
  rawItems: ReorderItem[]
): Promise<{ success: boolean; count: number }> {
  // 1. Validação Zod
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    throw new Error(`Payload de reordenação de combos inválido: ${validation.error.message}`)
  }
  const items = validation.data

  const supabase = await createClient()

  // 2. Validação multi-tenant
  const store = await getStoreByOwner()
  if (!store || store.id !== storeId) {
    throw new Error('Acesso não autorizado para esta loja.')
  }

  // 3. Chamar a RPC segura
  const { error } = await supabase.rpc('reorder_combos', {
    p_store_id: storeId,
    p_items: items,
  })

  // 4. Fallback caso a RPC ainda não exista no Supabase
  if (error) {
    if (isRpcMissingError(error)) {
      console.warn(
        '[lib/db/storefront-reorder.ts] RPC reorder_combos não encontrada. Executando fallback...'
      )
      const results = await Promise.all(
        items.map((item) =>
          supabase
            .from('combos')
            .update({ sort_order: item.display_order })
            .eq('id', item.id)
            .eq('store_id', storeId)
        )
      )
      const hasColumnError = results.some((r) => r.error)

      // Se a coluna sort_order não existir na tabela combos, salva a ordem em store.settings.combos_order
      if (hasColumnError) {
        console.warn(
          '[lib/db/storefront-reorder.ts] Coluna sort_order ausente em combos. Salvando em store.settings.combos_order...'
        )
        const currentSettings =
          store.settings && typeof store.settings === 'object'
            ? { ...(store.settings as Record<string, unknown>) }
            : {}
        currentSettings.combos_order = items.map((i) => i.id)

        await supabase
          .from('stores')
          .update({ settings: currentSettings as unknown as Json })
          .eq('id', storeId)
          .eq('owner_id', store.owner_id)
      }

      return { success: true, count: items.length }
    }
    console.error('[lib/db/storefront-reorder.ts] Erro ao reordenar combos:', error)
    throw new Error(`Erro ao reordenar combos: ${error.message}`)
  }

  return { success: true, count: items.length }
}

/**
 * Reordena a sequência de Seções no topo da Vitrine (drops, combos, categories)
 */
export async function reorderStorefrontSectionsDb(
  storeId: string,
  rawSections: StorefrontSectionKey[] | string[]
): Promise<{ success: boolean }> {
  const validation = reorderSectionsSchema.safeParse(rawSections)
  if (!validation.success) {
    throw new Error(`Payload de seções inválido: ${validation.error.message}`)
  }
  const sections = validation.data

  const supabase = await createClient()

  const store = await getStoreByOwner()
  if (!store || store.id !== storeId) {
    throw new Error('Acesso não autorizado para esta loja.')
  }

  const { error } = await supabase.rpc('reorder_storefront_sections', {
    p_store_id: storeId,
    p_sections: sections,
  })

  if (error) {
    if (isRpcMissingError(error)) {
      console.warn(
        '[lib/db/storefront-reorder.ts] RPC reorder_storefront_sections não encontrada. Salvando em store.settings...'
      )
      const currentSettings =
        store.settings && typeof store.settings === 'object'
          ? { ...(store.settings as Record<string, unknown>) }
          : {}
      currentSettings.storefront_sections_order = sections

      await supabase
        .from('stores')
        .update({ settings: currentSettings as unknown as Json })
        .eq('id', storeId)
        .eq('owner_id', store.owner_id)
      return { success: true }
    }
    console.error('[lib/db/storefront-reorder.ts] Erro ao salvar ordem de seções:', error)
    throw new Error(`Erro ao salvar ordem de seções: ${error.message}`)
  }

  return { success: true }
}
