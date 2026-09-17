import { z } from 'zod'
import type { Database } from '@/types/database.types'

export const faqSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  question: z
    .string()
    .min(1, 'A pergunta é obrigatória.')
    .max(500, 'A pergunta deve ter no máximo 500 caracteres.'),
  answer: z
    .string()
    .min(1, 'A resposta é obrigatória.')
    .max(3000, 'A resposta deve ter no máximo 3000 caracteres.'),
  order: z.number().int().default(0),
  created_at: z.string().optional(),
})

export const faqInputSchema = z.object({
  id: z.string().uuid().optional(),
  question: z
    .string()
    .min(1, 'A pergunta é obrigatória.')
    .max(500, 'A pergunta deve ter no máximo 500 caracteres.'),
  answer: z
    .string()
    .min(1, 'A resposta é obrigatória.')
    .max(3000, 'A resposta deve ter no máximo 3000 caracteres.'),
  order: z.number().int().default(0),
})

export const faqsArraySchema = z.array(faqInputSchema)

export type Faq = Database['public']['Tables']['faqs']['Row']
export type FaqInsert = Database['public']['Tables']['faqs']['Insert']
export type FaqUpdate = Database['public']['Tables']['faqs']['Update']
export type FaqInput = z.infer<typeof faqInputSchema>
