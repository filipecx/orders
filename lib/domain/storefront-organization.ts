import { z } from 'zod'
import { storeThemeSchema } from './stores'

/**
 * Item individual no payload otimizado de reordenação.
 * Enviamos apenas os campos estritamente necessários para evitar tráfego inútil de dados.
 */
export const reorderItemSchema = z.object({
  id: z.string().uuid('ID inválido.'),
  display_order: z
    .number({ message: 'A posição deve ser um número.' })
    .int('A posição deve ser um número inteiro.')
    .nonnegative('A posição deve ser maior ou igual a zero.'),
})

export type ReorderItem = z.infer<typeof reorderItemSchema>

/**
 * Schema para validação do payload completo antes de disparar a RPC
 */
export const reorderPayloadSchema = z.array(reorderItemSchema)
export type ReorderPayload = z.infer<typeof reorderPayloadSchema>

/**
 * Identificadores das seções principais da vitrine
 */
export const storefrontSectionKeyEnum = z.enum(['drops', 'combos', 'categories'])
export type StorefrontSectionKey = z.infer<typeof storefrontSectionKeyEnum>

export const reorderSectionsSchema = z.array(z.string().min(1))
export type ReorderSectionsPayload = z.infer<typeof reorderSectionsSchema>

export const saveAllStorefrontPayloadSchema = z.object({
  sectionsOrder: reorderSectionsSchema.optional(),
  categories: reorderPayloadSchema.optional(),
  products: reorderPayloadSchema.optional(),
  combos: reorderPayloadSchema.optional(),
  theme: storeThemeSchema.optional(),
  banner_url: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional(),
})
export type SaveAllStorefrontPayload = z.infer<typeof saveAllStorefrontPayloadSchema>

export const DEFAULT_STOREFRONT_SECTIONS_ORDER: StorefrontSectionKey[] = [
  'drops',
  'combos',
  'categories',
]

export const STOREFRONT_SECTION_LABELS: Record<StorefrontSectionKey, {
  label: string
  description: string
}> = {
  drops: {
    label: 'Pré-vendas & Drops',
    description: 'Campanhas de lançamentos com cronômetro e estoques alocados.',
  },
  combos: {
    label: 'Combos & Caixas Promocionais',
    description: 'Kits especiais com regras de escolha por categoria.',
  },
  categories: {
    label: 'Categorias do Catálogo',
    description: 'Produtos regulares organizados pelas categorias da loja.',
  },
}

/**
 * Extrai a ordem personalizada de seções a partir das configurações da loja.
 */
export function getStorefrontSectionsOrder(
  settings?: Record<string, unknown> | null
): StorefrontSectionKey[] {
  if (!settings || typeof settings !== 'object') {
    return [...DEFAULT_STOREFRONT_SECTIONS_ORDER]
  }

  const rawOrder = settings.storefront_sections_order
  if (Array.isArray(rawOrder)) {
    const validKeys: StorefrontSectionKey[] = []
    for (const key of rawOrder) {
      if (key === 'drops' || key === 'combos' || key === 'categories') {
        if (!validKeys.includes(key)) {
          validKeys.push(key)
        }
      }
    }
    // Adiciona seções que possam ter faltado no array salvo
    for (const def of DEFAULT_STOREFRONT_SECTIONS_ORDER) {
      if (!validKeys.includes(def)) {
        validKeys.push(def)
      }
    }
    return validKeys
  }

  return [...DEFAULT_STOREFRONT_SECTIONS_ORDER]
}

/**
 * Helper puro para gerar a lista de ReorderItem a partir de um array ordenado de objetos com `id`.
 */
export function createReorderPayload<T extends { id: string }>(items: T[]): ReorderItem[] {
  return items.map((item, index) => ({
    id: item.id,
    display_order: index,
  }))
}

/**
 * Helper puro de imutabilidade para reordenar arrays baseado em índices de drag and drop.
 */
export function reorderArray<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list)
  const [removed] = result.splice(startIndex, 1)
  result.splice(endIndex, 0, removed)
  return result
}
