import { z } from 'zod'
import type { Database } from '@/types/database.types'
import type { Product } from './products'

export const dropStatusEnum = z.enum([
  'draft',
  'scheduled',
  'active',
  'paused',
  'ended',
  'sold_out',
])

export type DropStatus = z.infer<typeof dropStatusEnum>

export const dropItemInputSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid('Selecione um produto válido.'),
  custom_price: z.coerce
    .number({ message: 'Preço customizado inválido.' })
    .min(0)
    .nullable()
    .optional(),
  promotional_price: z.coerce
    .number({ message: 'Preço promocional inválido.' })
    .min(0)
    .nullable()
    .optional(),
  allocated_quantity: z.coerce
    .number({ message: 'Estoque reservado deve ser um número inteiro.' })
    .int('O estoque deve ser inteiro.')
    .min(1, 'A quantidade alocada deve ser no mínimo 1.'),
  max_per_order: z.coerce
    .number()
    .int()
    .min(1)
    .nullable()
    .optional(),
  is_active: z.boolean().optional().default(true),
})

export type DropItemInput = z.infer<typeof dropItemInputSchema>

export const dropFormSchema = z.object({
  id: z.string().uuid().optional(),
  title: z
    .string()
    .min(2, 'O título da pré-venda deve ter pelo menos 2 caracteres.')
    .max(255, 'O título da pré-venda deve ter no máximo 255 caracteres.'),
  slug: z
    .string()
    .min(2, 'O slug deve ter pelo menos 2 caracteres.')
    .max(100, 'O slug deve ter no máximo 100 caracteres.')
    .regex(
      /^[a-z0-9-]+$/,
      'O slug deve conter apenas letras minúsculas, números e hífens.'
    ),
  description: z.string().max(2000).nullable().optional(),
  banner_url: z
    .string()
    .url('Insira uma URL válida de banner.')
    .nullable()
    .optional()
    .or(z.literal('')),
  status: dropStatusEnum.default('draft'),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  max_orders: z.coerce.number().int().min(1).nullable().optional(),
  is_active: z.boolean().optional().default(true),
  items: z.array(dropItemInputSchema).min(1, 'Adicione pelo menos um produto à pré-venda.'),
})

export type DropFormInput = z.infer<typeof dropFormSchema>

export type Drop = Database['public']['Tables']['drops']['Row']
export type DropInsert = Database['public']['Tables']['drops']['Insert']
export type DropUpdate = Database['public']['Tables']['drops']['Update']
export type DropItem = Database['public']['Tables']['drop_items']['Row']
export type DropItemInsert = Database['public']['Tables']['drop_items']['Insert']
export type DropItemUpdate = Database['public']['Tables']['drop_items']['Update']

export type DropItemWithProduct = DropItem & {
  product?: Product | null
}

export type DropWithItems = Drop & {
  items: DropItemWithProduct[]
}

// Funções puras de regras de negócio
export function isDropExpired(endsAt: string | null | undefined): boolean {
  if (!endsAt) return false
  return new Date(endsAt).getTime() < Date.now()
}

export function isDropActive(drop: {
  status: DropStatus
  ends_at?: string | null
  is_active?: boolean | null
}): boolean {
  if (drop.is_active === false) return false
  if (drop.status !== 'active') return false
  if (drop.ends_at && isDropExpired(drop.ends_at)) return false
  return true
}

export function formatDropStatus(
  status: DropStatus,
  endsAt?: string | null
): {
  label: string
  colorClass: string
} {
  if (status === 'active' && endsAt && isDropExpired(endsAt)) {
    return { label: 'Encerrada (Expirada)', colorClass: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
  }

  switch (status) {
    case 'draft':
      return { label: 'Rascunho', colorClass: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
    case 'scheduled':
      return { label: 'Agendada', colorClass: 'bg-amber-50 text-amber-800 border-amber-200' }
    case 'active':
      return { label: 'Ao Vivo / Ativa', colorClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    case 'paused':
      return { label: 'Pausada', colorClass: 'bg-neutral-100 text-neutral-700 border-neutral-200' }
    case 'ended':
      return { label: 'Encerrada', colorClass: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
    case 'sold_out':
      return { label: 'Esgotada', colorClass: 'bg-rose-50 text-rose-800 border-rose-200' }
    default:
      return { label: status, colorClass: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
  }
}

export function calculateDropStockSummary(items: DropItem[]): {
  totalAllocated: number
  totalSold: number
  totalRemaining: number
  percentSold: number
} {
  const totalAllocated = items.reduce((acc, item) => acc + (item.allocated_quantity || 0), 0)
  const totalSold = items.reduce((acc, item) => acc + (item.sold_quantity || 0), 0)
  const totalRemaining = Math.max(0, totalAllocated - totalSold)
  const percentSold = totalAllocated > 0 ? Math.round((totalSold / totalAllocated) * 100) : 0

  return {
    totalAllocated,
    totalSold,
    totalRemaining,
    percentSold,
  }
}
