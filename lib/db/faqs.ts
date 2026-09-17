import { createClient } from '@/lib/supabase/server'
import type { Faq, FaqInput } from '@/lib/domain/faqs'

/**
 * Busca todas as perguntas frequentes (FAQs) cadastradas para uma determinada loja,
 * ordenadas pelo campo `order` em ordem crescente.
 */
export async function getFaqsByStoreId(storeId: string): Promise<Faq[]> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('faqs')
      .select('*')
      .eq('store_id', storeId)
      .order('order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      if (error.code === 'PGRST205') {
        console.warn(
          '[lib/db/faqs.ts] Tabela public.faqs ainda não criada no Supabase. Execute a migration SQL no Supabase SQL Editor.'
        )
        return []
      }
      console.error(
        '[lib/db/faqs.ts] Erro ao buscar FAQs da loja:',
        error.message || error.details || JSON.stringify(error)
      )
      return []
    }

    return data ?? []
  } catch (err) {
    console.error('[lib/db/faqs.ts] Exceção ao buscar FAQs:', err)
    return []
  }
}

/**
 * Salva e sincroniza as FAQs de uma loja:
 * Remove as FAQs antigas da loja e insere as novas mantendo a ordem especificada.
 */
export async function saveStoreFaqs(
  storeId: string,
  faqs: FaqInput[]
): Promise<Faq[]> {
  const supabase = await createClient()

  try {
    // 1. Remove as FAQs existentes da loja
    const { error: deleteError } = await supabase
      .from('faqs')
      .delete()
      .eq('store_id', storeId)

    if (deleteError) {
      if (deleteError.code === 'PGRST205') {
        console.warn(
          '[lib/db/faqs.ts] Tabela public.faqs ainda não criada no Supabase. Execute a migration SQL no Supabase SQL Editor.'
        )
        return []
      }
      console.error('[lib/db/faqs.ts] Erro ao limpar FAQs existentes:', deleteError)
      throw new Error(`Erro ao atualizar FAQs: ${deleteError.message}`)
    }

    // 2. Se não houver novas perguntas, retorna array vazio
    if (!faqs || faqs.length === 0) {
      return []
    }

    // 3. Prepara as novas FAQs com os índices de ordem
    const payload = faqs.map((faq, index) => ({
      store_id: storeId,
      question: faq.question.trim(),
      answer: faq.answer.trim(),
      order: index,
    }))

    const { data, error: insertError } = await supabase
      .from('faqs')
      .insert(payload)
      .select('*')
      .order('order', { ascending: true })

    if (insertError) {
      if (insertError.code === 'PGRST205') {
        console.warn(
          '[lib/db/faqs.ts] Tabela public.faqs ainda não criada no Supabase. Execute a migration SQL no Supabase SQL Editor.'
        )
        return []
      }
      console.error('[lib/db/faqs.ts] Erro ao inserir novas FAQs:', insertError)
      throw new Error(`Erro ao salvar FAQs: ${insertError.message}`)
    }

    return data ?? []
  } catch (err) {
    console.error('[lib/db/faqs.ts] Exceção ao salvar FAQs:', err)
    return []
  }
}
