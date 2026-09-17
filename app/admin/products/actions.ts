'use server'

import { revalidatePath } from 'next/cache'
import { productInputSchema, type ProductInput } from '@/lib/domain/products'
import {
  createProduct,
  updateProduct,
  toggleProductStatus,
  deleteProduct,
} from '@/lib/db/products'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

export async function saveProductAction(
  formData: ProductInput
): Promise<ActionResult> {
  const validationResult = productInputSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos. Corrija os campos do produto.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const data = validationResult.data
    let product

    if (data.id) {
      product = await updateProduct(data.id, data)
    } else {
      product = await createProduct(data)
    }

    revalidatePath('/admin/products')
    revalidatePath('/admin/drops')

    return {
      success: true,
      message: data.id
        ? 'Produto atualizado com sucesso!'
        : 'Produto cadastrado com sucesso!',
      data: product,
    }
  } catch (error) {
    console.error('[saveProductAction] Erro:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao salvar informações do produto.',
    }
  }
}

import { z } from 'zod'

const toggleProductStatusSchema = z.object({
  productId: z.string().uuid('ID de produto inválido.'),
  isActive: z.boolean(),
})

const deleteProductSchema = z.string().uuid('ID de produto inválido.')

export async function toggleProductStatusAction(
  productId: string,
  isActive: boolean
): Promise<ActionResult> {
  const validation = toggleProductStatusSchema.safeParse({ productId, isActive })
  if (!validation.success) {
    return {
      success: false,
      message: 'Parâmetros inválidos para alterar visibilidade do produto.',
    }
  }

  try {
    await toggleProductStatus(validation.data.productId, validation.data.isActive)
    revalidatePath('/admin/products')
    return {
      success: true,
      message: validation.data.isActive ? 'Produto ativado!' : 'Produto desativado!',
    }
  } catch (error) {
    console.error('[toggleProductStatusAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao alterar visibilidade do produto.',
    }
  }
}

export async function deleteProductAction(
  productId: string
): Promise<ActionResult> {
  const validation = deleteProductSchema.safeParse(productId)
  if (!validation.success) {
    return {
      success: false,
      message: 'ID de produto inválido.',
    }
  }

  try {
    await deleteProduct(validation.data)
    revalidatePath('/admin/products')
    revalidatePath('/admin/drops')
    return {
      success: true,
      message: 'Produto excluído com sucesso!',
    }
  } catch (error) {
    console.error('[deleteProductAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao excluir o produto. Verifique se ele está vinculado a algum pedido ou drop.',
    }
  }
}
