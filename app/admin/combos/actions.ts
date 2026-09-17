'use server'

import { revalidatePath } from 'next/cache'
import {
  comboInputSchema,
  type ComboInput,
} from '@/lib/domain/combos'
import {
  createCombo,
  updateCombo,
  toggleComboStatus,
  deleteCombo,
} from '@/lib/db/combos'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

/**
 * Salva ou atualiza um combo customizável com suas regras de categorias.
 */
export async function saveComboAction(
  formData: ComboInput
): Promise<ActionResult> {
  const validationResult = comboInputSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos. Verifique as informações do combo e suas regras.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const data = validationResult.data
    let combo

    if (data.id) {
      combo = await updateCombo(data.id, data)
    } else {
      combo = await createCombo(data)
    }

    revalidatePath('/admin/combos')

    return {
      success: true,
      message: data.id
        ? 'Combo atualizado com sucesso!'
        : 'Combo cadastrado com sucesso!',
      data: combo,
    }
  } catch (error) {
    console.error('[saveComboAction] Erro:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao salvar informações do combo.',
    }
  }
}

import { z } from 'zod'

const toggleComboStatusSchema = z.object({
  comboId: z.string().uuid('ID de combo inválido.'),
  active: z.boolean(),
})

const deleteComboSchema = z.string().uuid('ID de combo inválido.')

/**
 * Ativa ou desativa um combo.
 */
export async function toggleComboStatusAction(
  comboId: string,
  active: boolean
): Promise<ActionResult> {
  const validation = toggleComboStatusSchema.safeParse({ comboId, active })
  if (!validation.success) {
    return {
      success: false,
      message: 'Parâmetros inválidos para alterar visibilidade do combo.',
    }
  }

  try {
    await toggleComboStatus(validation.data.comboId, validation.data.active)
    revalidatePath('/admin/combos')
    return {
      success: true,
      message: validation.data.active ? 'Combo ativado!' : 'Combo desativado!',
    }
  } catch (error) {
    console.error('[toggleComboStatusAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao alterar visibilidade do combo.',
    }
  }
}

/**
 * Remove um combo e suas regras.
 */
export async function deleteComboAction(
  comboId: string
): Promise<ActionResult> {
  const validation = deleteComboSchema.safeParse(comboId)
  if (!validation.success) {
    return {
      success: false,
      message: 'ID de combo inválido.',
    }
  }

  try {
    await deleteCombo(validation.data)
    revalidatePath('/admin/combos')
    return {
      success: true,
      message: 'Combo excluído com sucesso!',
    }
  } catch (error) {
    console.error('[deleteComboAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao excluir combo.',
    }
  }
}
