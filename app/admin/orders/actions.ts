'use server'

import { revalidatePath } from 'next/cache'
import {
  updateOrderStatusSchema,
  productionStatusEnum,
  type UpdateOrderStatusInput,
  type ProductionStatus,
  type OrderWithItems,
} from '@/lib/domain/orders'
import {
  updateOrderStatus,
  updateProductionStatus,
  getHistoryOrdersByStoreId,
  getHistoryOrdersCount,
  getOrderById,
  type PaginatedOrdersResult,
} from '@/lib/db/orders'
import { updateStoreAutoConfirmOrders, getStoreByOwner } from '@/lib/db/stores'
import { z } from 'zod'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

/**
 * Atualiza o status comercial / pagamento de um pedido com validação via Zod.
 */
export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput
): Promise<ActionResult<OrderWithItems>> {
  const validationResult = updateOrderStatusSchema.safeParse(input)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos para alteração de status.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const { order_id, status, payment_status, production_status } = validationResult.data
    const updatedOrder = await updateOrderStatus(
      order_id,
      status,
      payment_status,
      production_status
    )

    revalidatePath('/admin/orders')

    return {
      success: true,
      message: 'Status do pedido atualizado com sucesso!',
      data: updatedOrder,
    }
  } catch (error) {
    console.error('[updateOrderStatusAction] Erro ao atualizar status do pedido:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao atualizar status do pedido.',
    }
  }
}

const updateProductionStatusSchema = z.object({
  order_id: z.string().uuid(),
  production_status: productionStatusEnum,
})

/**
 * Atualiza o status da linha de produção do pedido (pending, preparing, ready, delivered).
 */
export async function updateProductionStatusAction(input: {
  order_id: string
  production_status: ProductionStatus
}): Promise<ActionResult<OrderWithItems>> {
  const validationResult = updateProductionStatusSchema.safeParse(input)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Status de produção inválido.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const { order_id, production_status } = validationResult.data
    const updatedOrder = await updateProductionStatus(order_id, production_status)

    revalidatePath('/admin/orders')

    return {
      success: true,
      message: `Status de produção atualizado para ${production_status}!`,
      data: updatedOrder,
    }
  } catch (error) {
    console.error('[updateProductionStatusAction] Erro ao atualizar produção:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro inesperado ao atualizar produção.',
    }
  }
}

const getHistoryOrdersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  search: z.string().optional(),
  statusFilter: z.enum(['all', 'delivered', 'cancelled']).default('all'),
})

export type GetHistoryOrdersInput = z.infer<typeof getHistoryOrdersSchema>

/**
 * Busca histórico paginado de pedidos via Server Action.
 */
export async function getHistoryOrdersAction(
  input?: GetHistoryOrdersInput
): Promise<ActionResult<PaginatedOrdersResult>> {
  const validationResult = getHistoryOrdersSchema.safeParse(input || {})

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Parâmetros de paginação inválidos.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const result = await getHistoryOrdersByStoreId(validationResult.data)
    return {
      success: true,
      message: 'Histórico carregado com sucesso.',
      data: result,
    }
  } catch (error) {
    console.error('[getHistoryOrdersAction] Erro ao buscar histórico:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao buscar histórico de pedidos.',
    }
  }
}

/**
 * Retorna a contagem rápida de pedidos finalizados e cancelados.
 */
export async function getHistoryOrdersCountAction(): Promise<
  ActionResult<{ total: number; delivered: number; cancelled: number }>
> {
  try {
    const counts = await getHistoryOrdersCount()
    return {
      success: true,
      message: 'Contagem obtida com sucesso.',
      data: counts,
    }
  } catch (error) {
    console.error('[getHistoryOrdersCountAction] Erro ao obter contagem:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Erro ao obter contagem.',
    }
  }
}

const toggleAutoConfirmSchema = z.object({
  store_id: z.string().uuid('ID da loja inválido.'),
  auto_confirm: z.boolean(),
})

/**
 * Alterna a confirmação automática de pedidos da loja.
 */
export async function toggleAutoConfirmOrdersAction(input: {
  store_id: string
  auto_confirm: boolean
}): Promise<ActionResult<{ auto_confirm: boolean }>> {
  const validationResult = toggleAutoConfirmSchema.safeParse(input)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Parâmetros inválidos para alterar confirmação automática.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const { store_id, auto_confirm } = validationResult.data
    await updateStoreAutoConfirmOrders(store_id, auto_confirm)

    revalidatePath('/admin/orders')
    revalidatePath('/admin')

    return {
      success: true,
      message: auto_confirm
        ? '⚡ Confirmação automática ATIVADA! Novos pedidos entrarão direto em Preparo.'
        : 'Confirmação automática DESATIVADA. Novos pedidos aguardarão aprovação manual.',
      data: { auto_confirm },
    }
  } catch (error) {
    console.error('[toggleAutoConfirmOrdersAction] Erro:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro ao alternar confirmação automática.',
    }
  }
}

const getOrderByIdSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido.'),
})

/**
 * Busca os dados completos de um pedido pelo ID (usado na sincronização em tempo real).
 */
export async function getOrderByIdAction(input: {
  order_id: string
}): Promise<ActionResult<OrderWithItems>> {
  const validationResult = getOrderByIdSchema.safeParse(input)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'ID do pedido inválido.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  try {
    const store = await getStoreByOwner()
    if (!store) {
      return {
        success: false,
        message: 'Acesso não autorizado.',
      }
    }

    const order = await getOrderById(validationResult.data.order_id)

    if (!order || order.store_id !== store.id) {
      return {
        success: false,
        message: 'Pedido não encontrado.',
      }
    }

    return {
      success: true,
      message: 'Pedido carregado com sucesso.',
      data: order,
    }
  } catch (error) {
    console.error('[getOrderByIdAction] Erro ao buscar pedido:', error)
    return {
      success: false,
      message:
        error instanceof Error ? error.message : 'Erro ao buscar pedido.',
    }
  }
}

