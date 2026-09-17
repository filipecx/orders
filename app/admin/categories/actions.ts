'use server'

import { revalidatePath } from 'next/cache'
import {
  categoryInputSchema,
  type CategoryInput,
} from '@/lib/domain/categories'
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/db/categories'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

/**
 * Cadastra ou atualiza uma categoria gastronômica.
 */
export async function saveCategoryAction(
  formData: CategoryInput
): Promise<ActionResult> {
  const validationResult = categoryInputSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos. Corrija os campos da categoria.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const data = validationResult.data
    let category

    if (data.id) {
      category = await updateCategory(data.id, data)
    } else {
      category = await createCategory(data)
    }

    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/admin/combos')

    return {
      success: true,
      message: data.id
        ? 'Categoria atualizada com sucesso!'
        : 'Categoria cadastrada com sucesso!',
      data: category,
    }
  } catch (error) {
    console.error('[saveCategoryAction] Erro ao salvar categoria:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao salvar informações da categoria.',
    }
  }
}

import { z } from 'zod'

const deleteCategorySchema = z.string().uuid('ID de categoria inválido.')

/**
 * Remove uma categoria da loja.
 */
export async function deleteCategoryAction(
  categoryId: string
): Promise<ActionResult> {
  const validation = deleteCategorySchema.safeParse(categoryId)
  if (!validation.success) {
    return {
      success: false,
      message: 'ID de categoria inválido.',
    }
  }

  try {
    await deleteCategory(validation.data)
    revalidatePath('/admin/categories')
    revalidatePath('/admin/products')
    revalidatePath('/admin/combos')

    return {
      success: true,
      message: 'Categoria excluída com sucesso!',
    }
  } catch (error) {
    console.error('[deleteCategoryAction] Erro ao excluir categoria:', error)
    return {
      success: false,
      message:
        'Erro ao excluir a categoria. Verifique se existem produtos ou combos vinculados.',
    }
  }
}
