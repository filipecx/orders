import { z } from 'zod'
import type { Database } from '@/types/database.types'
import type { Category } from './categories'

export const comboSaleTypeEnum = z.enum(['ready_delivery', 'order'])
export type ComboSaleType = z.infer<typeof comboSaleTypeEnum>

export const COMBO_SALE_TYPE_LABELS: Record<ComboSaleType, string> = {
  ready_delivery: 'Pronta-Entrega',
  order: 'Encomenda',
}

export const comboRuleInputSchema = z.object({
  id: z.string().uuid().optional(),
  combo_id: z.string().uuid().optional(),
  category_id: z.string().uuid('Selecione uma categoria válida.'),
  required_quantity: z.coerce
    .number({ message: 'Quantidade obrigatória deve ser um número inteiro.' })
    .int('Quantidade deve ser um número inteiro.')
    .min(1, 'A quantidade mínima por categoria é 1.'),
})

export type ComboRuleInput = z.infer<typeof comboRuleInputSchema>

export const comboInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z
    .string()
    .min(2, 'O nome do combo deve ter pelo menos 2 caracteres.')
    .max(255, 'O nome do combo deve ter no máximo 255 caracteres.'),
  description: z.string().max(2000).nullable().optional(),
  price: z.coerce
    .number({ message: 'Preço deve ser um número válido.' })
    .min(0, 'O preço não pode ser negativo.'),
  sale_type: comboSaleTypeEnum.default('order'),
  image_url: z
    .string()
    .url('Insira uma URL válida de imagem.')
    .nullable()
    .optional()
    .or(z.literal('')),
  active: z.boolean().optional().default(true),
  rules: z.array(comboRuleInputSchema).optional().default([]),
})

export type ComboInput = z.infer<typeof comboInputSchema>

export type Combo = Database['public']['Tables']['combos']['Row']
export type ComboInsert = Database['public']['Tables']['combos']['Insert']
export type ComboUpdate = Database['public']['Tables']['combos']['Update']

export type ComboRule = Database['public']['Tables']['combo_rules']['Row']
export type ComboRuleInsert = Database['public']['Tables']['combo_rules']['Insert']
export type ComboRuleUpdate = Database['public']['Tables']['combo_rules']['Update']

export type ComboRuleWithCategory = ComboRule & {
  category?: Category | null
}

export type ComboWithRules = Combo & {
  rules: ComboRuleWithCategory[]
}

// Funções puras de regras de negócio
export function calculateComboTotalItems(rules: ComboRule[] | ComboRuleInput[]): number {
  return rules.reduce((acc, rule) => acc + (rule.required_quantity || 0), 0)
}

/**
 * Valida se as seleções do cliente atendem exatamente aos requisitos das regras do combo.
 */
export function validateComboSelection(
  rules: ComboRule[],
  selectedItemCountsByCategory: Record<string, number>
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const rule of rules) {
    const selectedCount = selectedItemCountsByCategory[rule.category_id] || 0
    if (selectedCount !== rule.required_quantity) {
      errors.push(
        `Categoria requer ${rule.required_quantity} item(ns), mas ${selectedCount} foi(ram) selecionado(s).`
      )
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
