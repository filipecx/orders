'use server'

import { revalidatePath } from 'next/cache'
import { dropFormSchema, type DropFormInput, type DropStatus } from '@/lib/domain/drops'
import {
  createDrop,
  updateDrop,
  updateDropStatus,
  deleteDrop,
} from '@/lib/db/drops'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

export async function saveDropAction(
  formData: DropFormInput
): Promise<ActionResult> {
  const validationResult = dropFormSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados do Drop inválidos. Verifique os campos e os produtos selecionados.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const data = validationResult.data
    let drop

    if (data.id) {
      drop = await updateDrop(data.id, data)
    } else {
      drop = await createDrop(data)
    }

    revalidatePath('/admin/drops')
    if (drop.slug) {
      revalidatePath(`/drops/${drop.slug}`)
    }

    return {
      success: true,
      message: data.id
        ? 'Drop atualizado com sucesso!'
        : 'Drop agendado e criado com sucesso!',
      data: drop,
    }
  } catch (error) {
    console.error('[saveDropAction] Erro ao salvar drop:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Erro ao processar o drop.',
    }
  }
}

import { z } from 'zod'
import { dropStatusEnum } from '@/lib/domain/drops'

const updateDropStatusSchema = z.object({
  dropId: z.string().uuid('ID de drop inválido.'),
  status: dropStatusEnum,
})

const deleteDropSchema = z.string().uuid('ID de drop inválido.')

export async function updateDropStatusAction(
  dropId: string,
  status: DropStatus
): Promise<ActionResult> {
  const validation = updateDropStatusSchema.safeParse({ dropId, status })
  if (!validation.success) {
    return {
      success: false,
      message: 'Parâmetros inválidos para alterar status do drop.',
    }
  }

  try {
    await updateDropStatus(validation.data.dropId, validation.data.status)
    revalidatePath('/admin/drops')
    return {
      success: true,
      message: `Status do drop alterado para ${status}!`,
    }
  } catch (error) {
    console.error('[updateDropStatusAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao alterar o status do drop.',
    }
  }
}

export async function deleteDropAction(dropId: string): Promise<ActionResult> {
  const validation = deleteDropSchema.safeParse(dropId)
  if (!validation.success) {
    return {
      success: false,
      message: 'ID de drop inválido.',
    }
  }

  try {
    await deleteDrop(validation.data)
    revalidatePath('/admin/drops')
    return {
      success: true,
      message: 'Drop excluído com sucesso!',
    }
  } catch (error) {
    console.error('[deleteDropAction] Erro:', error)
    return {
      success: false,
      message: 'Erro ao excluir o drop.',
    }
  }
}
