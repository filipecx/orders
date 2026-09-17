import { z } from 'zod'
import type { Database } from '@/types/database.types'
import type { Category } from './categories'

export const saleTypeEnum = z.enum(['ready_delivery', 'order', 'both'])
export type SaleType = z.infer<typeof saleTypeEnum>

export const SALE_TYPE_LABELS: Record<SaleType, string> = {
  ready_delivery: 'Pronta-Entrega',
  order: 'Encomenda',
  both: 'Pronta-Entrega & Encomenda',
}

export const productInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: z
      .string()
      .min(2, 'O nome do produto deve ter pelo menos 2 caracteres.')
      .max(255, 'O nome do produto deve ter no máximo 255 caracteres.'),
    description: z.string().max(2000).nullable().optional(),
    price: z.coerce
      .number({ message: 'Preço deve ser um número válido.' })
      .min(0, 'O preço não pode ser negativo.'),
    promotional_price: z.coerce
      .number({ message: 'Preço promocional deve ser um número válido.' })
      .min(0, 'O preço promocional não pode ser negativo.')
      .nullable()
      .optional(),
    allow_ready_delivery: z.boolean().default(true),
    allow_order: z.boolean().default(false),
    different_prices_by_mode: z.boolean().default(false),
    price_ready_delivery: z.coerce
      .number({ message: 'Preço de pronta-entrega deve ser um número válido.' })
      .min(0, 'O preço de pronta-entrega não pode ser negativo.')
      .nullable()
      .optional(),
    price_order: z.coerce
      .number({ message: 'Preço de encomenda deve ser um número válido.' })
      .min(0, 'O preço de encomenda não pode ser negativo.')
      .nullable()
      .optional(),
    sale_type: saleTypeEnum.optional().default('ready_delivery'),
    lead_time_days: z.coerce
      .number({ message: 'Dias de antecedência deve ser um número inteiro.' })
      .int()
      .min(0, 'O prazo de produção não pode ser negativo.')
      .optional()
      .default(0),
    image_url: z
      .string()
      .url('Insira uma URL válida de imagem.')
      .nullable()
      .optional()
      .or(z.literal('')),
    images: z.array(z.string()).optional().default([]),
    sku: z.string().max(100).nullable().optional(),
    track_stock: z.boolean().optional().default(false),
    stock_quantity: z.coerce
      .number({ message: 'Quantidade de estoque deve ser um número inteiro.' })
      .int()
      .min(0, 'O estoque não pode ser negativo.')
      .optional()
      .default(0),
    sort_order: z.number().int().optional().default(0),
    is_active: z.boolean().optional().default(true),
    category_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (data) => data.allow_ready_delivery || data.allow_order,
    {
      message: 'Selecione ao menos uma modalidade de venda (Pronta-Entrega ou Encomenda).',
      path: ['allow_ready_delivery'],
    }
  )

export type ProductInput = z.infer<typeof productInputSchema>

export type Product = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type ProductWithCategory = Product & {
  category?: Category | null
}

// Funções puras de regras de negócio
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function calculateDiscountPercentage(
  price: number,
  promotionalPrice?: number | null
): number | null {
  if (!promotionalPrice || promotionalPrice >= price) return null
  const discount = ((price - promotionalPrice) / price) * 100
  return Math.round(discount)
}

/**
 * Calcula a data mínima disponível para entrega/retirada com base no lead_time_days.
 */
export function calculateEarliestDeliveryDate(leadTimeDays: number = 0, baseDate: Date = new Date()): Date {
  const result = new Date(baseDate)
  result.setDate(result.getDate() + Math.max(0, leadTimeDays))
  return result
}

/**
 * Retorna o preço efetivo de um produto para a modalidade solicitada.
 * Se houver preços diferenciados por modalidade e o valor específico estiver preenchido, usa-o.
 * Se algum preço for nulo ou a chave estiver desativada, usa o preço base (ou promocional se existente).
 */
export function getProductPriceForModality(
  product: {
    price: number
    promotional_price?: number | null
    different_prices_by_mode?: boolean | null
    price_ready_delivery?: number | null
    price_order?: number | null
  },
  modality: 'ready_delivery' | 'order'
): number {
  if (product.different_prices_by_mode) {
    if (modality === 'ready_delivery' && product.price_ready_delivery != null) {
      return product.price_ready_delivery
    }
    if (modality === 'order' && product.price_order != null) {
      return product.price_order
    }
  }
  return product.promotional_price ?? product.price
}

/**
 * Verifica se o produto está disponível na modalidade especificada.
 */
export function isProductAvailableInModality(
  product: {
    allow_ready_delivery?: boolean | null
    allow_order?: boolean | null
    sale_type?: string | null
  },
  modality: 'ready_delivery' | 'order'
): boolean {
  if (modality === 'ready_delivery') {
    if (product.allow_ready_delivery !== undefined && product.allow_ready_delivery !== null) {
      return product.allow_ready_delivery
    }
    return product.sale_type === 'ready_delivery' || product.sale_type === 'both'
  }
  if (modality === 'order') {
    if (product.allow_order !== undefined && product.allow_order !== null) {
      return product.allow_order
    }
    return product.sale_type === 'order' || product.sale_type === 'both'
  }
  return false
}
