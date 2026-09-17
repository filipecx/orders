'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { storeFormSchema, type StoreFormInput } from '@/lib/domain/stores'
import { faqsArraySchema, type FaqInput } from '@/lib/domain/faqs'
import { createOrUpdateStore, toggleStoreManualClosure } from '@/lib/db/stores'
import { saveStoreFaqs } from '@/lib/db/faqs'
import { cancelPendingReadyDeliveryOrders } from '@/lib/db/orders'

export type ActionResult<T = unknown> = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  data?: T
}

export type SaveStoreSettingsPayload = StoreFormInput & {
  faqs?: FaqInput[]
}

export async function saveStoreSettingsAction(
  formData: SaveStoreSettingsPayload
): Promise<ActionResult> {
  // 1. Validação estrita na borda com Zod
  const storeValidation = storeFormSchema.safeParse(formData)

  if (!storeValidation.success) {
    const flattened = storeValidation.error.flatten()
    return {
      success: false,
      message: 'Dados da loja inválidos. Por favor, corrija os erros destacados.',
      errors: flattened.fieldErrors,
    }
  }

  let faqsData: FaqInput[] = []
  if (formData.faqs && Array.isArray(formData.faqs)) {
    const faqsValidation = faqsArraySchema.safeParse(formData.faqs)
    if (!faqsValidation.success) {
      return {
        success: false,
        message: 'Perguntas Frequentes inválidas. Preencha todas as perguntas e respostas.',
      }
    }
    faqsData = faqsValidation.data
  }

  try {
    // 2. Obtenção segura do usuário autenticado no servidor
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message:
          'Usuário não autenticado. Por favor, faça login para salvar as configurações da sua loja.',
      }
    }

    // 3. Chamada isolada à camada de banco de dados
    const savedStore = await createOrUpdateStore(storeValidation.data, user.id)

    // 4. Salvar FAQs associadas à loja
    await saveStoreFaqs(savedStore.id, faqsData)

    // 5. Revalidação das rotas impactadas
    revalidatePath('/admin/settings')
    if (savedStore.slug) {
      revalidatePath(`/${savedStore.slug}`)
    }

    return {
      success: true,
      message: 'Configurações da loja, horários e FAQs salvos com sucesso!',
      data: savedStore,
    }
  } catch (error) {
    console.error('[saveStoreSettingsAction] Erro ao salvar loja:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Ocorreu um erro inesperado ao salvar as configurações.',
    }
  }
}

export async function toggleStoreManualClosureAction(
  storeId: string,
  isClosed: boolean
): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'Usuário não autenticado.' }
    }

    // Usar camada de banco de dados
    const store = await toggleStoreManualClosure(storeId, isClosed, user.id);

    // Se a loja foi pausada, cancela todas as cobranças e pedidos pendentes de pronta-entrega
    let cancelledCount = 0
    if (isClosed) {
      try {
        cancelledCount = await cancelPendingReadyDeliveryOrders(storeId)
      } catch (cancelErr) {
        console.error('[toggleStoreManualClosureAction] Erro ao cancelar pedidos pendentes:', cancelErr)
      }
    }

    revalidatePath('/admin')
    revalidatePath('/admin/orders')
    revalidatePath('/admin/settings')
    if (store.slug) {
      revalidatePath(`/${store.slug}`)
    }

    const baseMessage = isClosed ? 'Loja pausada com sucesso.' : 'Loja reaberta com sucesso.'
    const details = isClosed && cancelledCount > 0
      ? ` ${cancelledCount} pedido(s) pendente(s) de pronta-entrega cancelado(s).`
      : ''

    return {
      success: true,
      message: `${baseMessage}${details}`,
    }
  } catch (error) {
    console.error('[toggleStoreManualClosureAction] Erro:', error)
    return {
      success: false,
      message: 'Ocorreu um erro ao alterar o status da loja.',
    }
  }
}
