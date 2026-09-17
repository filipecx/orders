'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner, updateStoreAppearanceDb } from '@/lib/db/stores'
import {
  reorderCategoriesDb,
  reorderProductsDb,
  reorderCombosDb,
  reorderStorefrontSectionsDb,
} from '@/lib/db/storefront-reorder'
import {
  reorderPayloadSchema,
  reorderSectionsSchema,
  saveAllStorefrontPayloadSchema,
  type ReorderItem,
  type StorefrontSectionKey,
  type SaveAllStorefrontPayload,
} from '@/lib/domain/storefront-organization'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  data?: T
}

/**
 * Salva a nova ordenação de categorias da loja.
 */
export async function saveCategoryOrderAction(
  rawItems: ReorderItem[]
): Promise<ActionResult> {
  // 1. Validação estrita Zod
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    return {
      success: false,
      message: 'Dados de ordenação inválidos.',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const store = await getStoreByOwner(user.id)
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' }
    }

    await reorderCategoriesDb(store.id, validation.data)

    revalidatePath('/admin/storefront')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    return {
      success: true,
      message: 'Ordem das categorias atualizada com sucesso!',
    }
  } catch (error) {
    console.error('[saveCategoryOrderAction] Erro:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao salvar ordem.',
    }
  }
}

/**
 * Salva a nova ordenação de produtos da loja.
 */
export async function saveProductOrderAction(
  rawItems: ReorderItem[]
): Promise<ActionResult> {
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    return {
      success: false,
      message: 'Dados de ordenação inválidos.',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const store = await getStoreByOwner(user.id)
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' }
    }

    await reorderProductsDb(store.id, validation.data)

    revalidatePath('/admin/storefront')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    return {
      success: true,
      message: 'Ordem dos produtos atualizada com sucesso!',
    }
  } catch (error) {
    console.error('[saveProductOrderAction] Erro:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao salvar ordem.',
    }
  }
}

/**
 * Salva a nova ordenação de combos da loja.
 */
export async function saveComboOrderAction(
  rawItems: ReorderItem[]
): Promise<ActionResult> {
  const validation = reorderPayloadSchema.safeParse(rawItems)
  if (!validation.success) {
    return {
      success: false,
      message: 'Dados de ordenação inválidos.',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const store = await getStoreByOwner(user.id)
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' }
    }

    await reorderCombosDb(store.id, validation.data)

    revalidatePath('/admin/storefront')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    return {
      success: true,
      message: 'Ordem dos combos atualizada com sucesso!',
    }
  } catch (error) {
    console.error('[saveComboOrderAction] Erro:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao salvar ordem.',
    }
  }
}

/**
 * Salva a nova ordenação de seções principais da vitrine.
 */
export async function saveSectionOrderAction(
  rawSections: StorefrontSectionKey[] | string[]
): Promise<ActionResult> {
  const validation = reorderSectionsSchema.safeParse(rawSections)
  if (!validation.success) {
    return {
      success: false,
      message: 'Seções inválidas.',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const store = await getStoreByOwner(user.id)
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' }
    }

    await reorderStorefrontSectionsDb(store.id, validation.data)

    revalidatePath('/admin/storefront')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    return {
      success: true,
      message: 'Estrutura das seções da vitrine atualizada com sucesso!',
    }
  } catch (error) {
    console.error('[saveSectionOrderAction] Erro:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro ao salvar ordem.',
    }
  }
}

/**
 * Salva em lote com uma única requisição HTTP todas as alterações da vitrine
 * (seções, categorias, produtos e combos), executando revalidação única de cache.
 */
export async function saveAllStorefrontChangesAction(
  rawPayload: SaveAllStorefrontPayload
): Promise<ActionResult> {
  const validation = saveAllStorefrontPayloadSchema.safeParse(rawPayload)
  if (!validation.success) {
    return {
      success: false,
      message: 'Dados de organização inválidos.',
    }
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    const store = await getStoreByOwner(user.id)
    if (!store) {
      return { success: false, message: 'Loja não encontrada.' }
    }

    const {
      sectionsOrder,
      categories,
      products,
      combos,
      theme,
      banner_url,
      logo_url,
    } = validation.data
    const tasks: Promise<unknown>[] = []

    if (theme !== undefined || banner_url !== undefined || logo_url !== undefined) {
      tasks.push(
        updateStoreAppearanceDb(store.id, {
          theme,
          banner_url,
          logo_url,
        })
      )
    }

    if (sectionsOrder && sectionsOrder.length > 0) {
      tasks.push(reorderStorefrontSectionsDb(store.id, sectionsOrder))
    }
    if (categories && categories.length > 0) {
      tasks.push(reorderCategoriesDb(store.id, categories))
    }
    if (products && products.length > 0) {
      tasks.push(reorderProductsDb(store.id, products))
    }
    if (combos && combos.length > 0) {
      tasks.push(reorderCombosDb(store.id, combos))
    }

    await Promise.all(tasks)

    // Revalidação única do cache da vitrine pública e da página admin
    revalidatePath('/admin/storefront')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    return {
      success: true,
      message: 'Vitrine salva e publicada com sucesso!',
    }
  } catch (error) {
    console.error('[saveAllStorefrontChangesAction] Erro:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao salvar alterações da vitrine.',
    }
  }
}
