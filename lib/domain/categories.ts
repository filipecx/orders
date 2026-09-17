import { z } from 'zod'
import type { Database } from '@/types/database.types'

export const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(1, 'O nome da categoria é obrigatório.')
    .max(255, 'O nome da categoria deve ter no máximo 255 caracteres.'),
  description: z.string().max(1000).nullable().optional(),
  sort_order: z.coerce.number().int().optional().default(0),
  is_active: z.boolean().optional().default(true),
  store_id: z.string().uuid().optional(),
})

export type CategoryInput = z.infer<typeof categoryInputSchema>

export type Category = Database['public']['Tables']['categories']['Row']
export type CategoryInsert = Database['public']['Tables']['categories']['Insert']
export type CategoryUpdate = Database['public']['Tables']['categories']['Update']

/**
 * Ordena categorias pelo campo sort_order de forma pura.
 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
}
