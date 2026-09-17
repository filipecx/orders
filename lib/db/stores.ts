import { createClient } from '@/lib/supabase/server'
import type { Store, StoreFormInput, StoreTheme } from '@/lib/domain/stores'
import type { Json } from '@/types/database.types'

/**
 * Busca a loja pertencente a um determinado proprietário ou ao usuário autenticado atual.
 */
export async function getStoreByOwner(explicitOwnerId?: string): Promise<Store | null> {
  const supabase = await createClient()

  let ownerId = explicitOwnerId
  if (!ownerId) {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return null
      }
      ownerId = user.id
    } catch (err) {
      console.error('[lib/db/stores.ts] Erro ao obter usuário autenticado:', err)
      return null
    }
  }

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle()

  if (error) {
    console.error('[lib/db/stores.ts] Erro ao buscar loja pelo proprietário:', error)
    throw new Error(`Erro ao buscar loja: ${error.message}`)
  }

  return data
}

/**
 * Busca uma loja ativa pelo seu slug (usado para vitrine pública).
 */
export async function getStoreBySlug(slug: string): Promise<Store | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error('[lib/db/stores.ts] Erro ao buscar loja pelo slug:', error)
    throw new Error(`Erro ao buscar loja: ${error.message}`)
  }

  if (data) {
    return {
      ...data,
      owner_id: '',
    }
  }

  return null
}

/**
 * Cria ou atualiza a loja capturando automaticamente o ID do usuário autenticado (auth.getUser())
 * ou utilizando um ownerId explicitamente fornecido.
 */
export async function createOrUpdateStore(
  input: StoreFormInput,
  explicitOwnerId?: string
): Promise<Store> {
  const supabase = await createClient()

  let ownerId = explicitOwnerId
  if (!ownerId) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[lib/db/stores.ts] Usuário não autenticado:', authError)
      throw new Error('Usuário não autenticado para criar ou atualizar a loja.')
    }
    ownerId = user.id
  }

  // Verifica se o lojista já possui uma loja cadastrada
  const existingStore = await getStoreByOwner(ownerId)

  if (existingStore) {
    const currentSettings =
      existingStore.settings && typeof existingStore.settings === 'object'
        ? { ...(existingStore.settings as Record<string, unknown>) }
        : {}

    if (input.pickup_address !== undefined) {
      currentSettings.pickup_address = input.pickup_address
    }
    if (input.whatsapp_templates !== undefined) {
      currentSettings.whatsapp_templates = input.whatsapp_templates
    }
    if (input.theme !== undefined) {
      currentSettings.theme = input.theme
    }
    if (input.settings !== undefined && input.settings !== null) {
      Object.assign(currentSettings, input.settings)
    }

    const updatePayload: Record<string, unknown> = {
      name: input.name,
      slug: input.slug,
      whatsapp_number: input.whatsapp_number,
      pix_key_type: input.pix_key_type ?? null,
      pix_key: input.pix_key ?? null,
      pix_merchant_name: input.pix_merchant_name ?? null,
      pix_merchant_city: input.pix_merchant_city ?? null,
      primary_color:
        input.theme?.primary_color ??
        input.primary_color ??
        existingStore.primary_color,
      description: input.description ?? existingStore.description,
      logo_url:
        input.logo_url !== undefined
          ? input.logo_url && input.logo_url.length > 0
            ? input.logo_url
            : null
          : existingStore.logo_url,
      banner_url:
        input.banner_url !== undefined
          ? input.banner_url && input.banner_url.length > 0
            ? input.banner_url
            : null
          : existingStore.banner_url,
      phone: input.phone ?? existingStore.phone,
      business_hours:
        input.business_hours !== undefined
          ? input.business_hours
          : existingStore.business_hours,
      settings: currentSettings,
    }

    let { data, error } = await supabase
      .from('stores')
      // @ts-expect-error type inference from database types
      .update(updatePayload)
      .eq('id', existingStore.id)
      .eq('owner_id', ownerId)
      .select()
      .single()

    // Caso a coluna business_hours ainda não exista no Supabase (PGRST204), tenta salvar o restante
    if (error && error.code === 'PGRST204' && error.message?.includes('business_hours')) {
      console.warn(
        '[lib/db/stores.ts] Coluna business_hours ainda não criada no Supabase. Execute a migration SQL no Supabase SQL Editor.'
      )
      delete updatePayload.business_hours

      const retryRes = await supabase
        .from('stores')
        // @ts-expect-error retry fallback
        .update(updatePayload)
        .eq('id', existingStore.id)
        .eq('owner_id', ownerId)
        .select()
        .single()

      if (retryRes.error) {
        throw new Error(`Erro ao atualizar loja: ${retryRes.error.message}`)
      }
      return retryRes.data as unknown as Store
    }

    if (error) {
      console.error('[lib/db/stores.ts] Erro ao atualizar loja:', error)
      throw new Error(`Erro ao atualizar loja: ${error.message}`)
    }

    return data as unknown as Store
  }

  // Se não existir, cria uma nova loja associando o owner_id
  const initialSettings: Record<string, unknown> = {
    opening_hours: {},
    min_order_value: 0,
    delivery_fee: 0,
    allow_pickup: true,
    allow_delivery: true,
    pickup_address: input.pickup_address ?? null,
    whatsapp_templates: input.whatsapp_templates ?? null,
    theme: input.theme ?? null,
    ...(input.settings || {}),
  }

  const insertPayload: Record<string, unknown> = {
    owner_id: ownerId,
    name: input.name,
    slug: input.slug,
    whatsapp_number: input.whatsapp_number,
    pix_key_type: input.pix_key_type ?? null,
    pix_key: input.pix_key ?? null,
    pix_merchant_name: input.pix_merchant_name ?? null,
    pix_merchant_city: input.pix_merchant_city ?? null,
    primary_color: input.theme?.primary_color ?? input.primary_color ?? '#000000',
    description: input.description ?? null,
    logo_url: input.logo_url && input.logo_url.length > 0 ? input.logo_url : null,
    banner_url: input.banner_url && input.banner_url.length > 0 ? input.banner_url : null,
    phone: input.phone ?? null,
    business_hours: input.business_hours ?? null,
    settings: initialSettings,
  }

  let { data, error } = await supabase
    .from('stores')
    // @ts-expect-error type inference from database types
    .insert(insertPayload)
    .select()
    .single()

  // Fallback caso business_hours não exista na criação
  if (error && error.code === 'PGRST204' && error.message?.includes('business_hours')) {
    console.warn(
      '[lib/db/stores.ts] Coluna business_hours ainda não criada no Supabase. Execute a migration SQL no Supabase SQL Editor.'
    )
    delete insertPayload.business_hours

    const retryInsert = await supabase
      .from('stores')
      // @ts-expect-error retry fallback
      .insert(insertPayload)
      .select()
      .single()

    if (retryInsert.error) {
      throw new Error(`Erro ao criar loja: ${retryInsert.error.message}`)
    }
    return retryInsert.data as unknown as Store
  }

  if (error) {
    console.error('[lib/db/stores.ts] Erro ao criar loja:', error)
    throw new Error(`Erro ao criar loja: ${error.message}`)
  }

  return data as unknown as Store
}

/**
 * Atualiza o toggle de confirmação automática de pedidos da loja.
 */
export async function updateStoreAutoConfirmOrders(
  storeId: string,
  autoConfirm: boolean
): Promise<Store> {
  const supabase = await createClient()

  // 1. Obter a loja do usuário autenticado para validação multi-tenant estrita
  const authStore = await getStoreByOwner()
  if (!authStore || authStore.id !== storeId) {
    throw new Error('Não autorizado a alterar configurações desta loja.')
  }

  const currentSettings =
    authStore.settings && typeof authStore.settings === 'object'
      ? { ...(authStore.settings as Record<string, unknown>) }
      : {}

  currentSettings.auto_confirm_orders = autoConfirm

  const { data: updatedStore, error: updateError } = await supabase
    .from('stores')
    .update({ settings: currentSettings as unknown as Json })
    .eq('id', storeId)
    .eq('owner_id', authStore.owner_id)
    .select()
    .single()

  if (updateError || !updatedStore) {
    console.error('[lib/db/stores.ts] Erro ao atualizar confirmação automática:', updateError)
    throw new Error(`Erro ao atualizar confirmação automática: ${updateError?.message}`)
  }

  return updatedStore as unknown as Store
}

export interface StoreAppearanceInput {
  theme?: StoreTheme
  primary_color?: string
  banner_url?: string | null
  logo_url?: string | null
}

/**
 * Atualiza exclusivamente a aparência visual da loja (tema, cores, banner, logo)
 * sem interferir em dados operacionais como PIX, endereço de retirada ou horários.
 */
export async function updateStoreAppearanceDb(
  storeId: string,
  appearance: StoreAppearanceInput
): Promise<Store> {
  const supabase = await createClient()

  // Validação multi-tenant: garantir que a loja pertence ao usuário autenticado
  const authStore = await getStoreByOwner()
  if (!authStore || authStore.id !== storeId) {
    throw new Error('Não autorizado a alterar a aparência desta loja.')
  }

  const currentSettings =
    authStore.settings && typeof authStore.settings === 'object'
      ? { ...(authStore.settings as Record<string, unknown>) }
      : {}

  if (appearance.theme !== undefined) {
    currentSettings.theme = appearance.theme
  }

  const updatePayload: Record<string, unknown> = {
    settings: currentSettings as unknown as Json,
  }

  if (appearance.theme?.primary_color) {
    updatePayload.primary_color = appearance.theme.primary_color
  } else if (appearance.primary_color) {
    updatePayload.primary_color = appearance.primary_color
  }

  if (appearance.banner_url !== undefined) {
    updatePayload.banner_url =
      appearance.banner_url && appearance.banner_url.length > 0
        ? appearance.banner_url
        : null
  }

  if (appearance.logo_url !== undefined) {
    updatePayload.logo_url =
      appearance.logo_url && appearance.logo_url.length > 0
        ? appearance.logo_url
        : null
  }

  const { data: updatedStore, error: updateError } = await supabase
    .from('stores')
    // @ts-expect-error type inference from database types
    .update(updatePayload)
    .eq('id', storeId)
    .eq('owner_id', authStore.owner_id)
    .select()
    .single()

  if (updateError || !updatedStore) {
    console.error('[lib/db/stores.ts] Erro ao atualizar aparência da loja:', updateError)
    throw new Error(`Erro ao atualizar aparência da loja: ${updateError?.message}`)
  }

  return updatedStore as unknown as Store
}

/**
 * Altera o status de fechamento manual da loja.
 */
export async function toggleStoreManualClosure(
  storeId: string,
  isClosed: boolean,
  ownerId: string
): Promise<Store> {
  const supabase = await createClient()

  const { data: store, error: fetchError } = await supabase
    .from('stores')
    .select('id, settings, owner_id, slug')
    .eq('id', storeId)
    .eq('owner_id', ownerId)
    .single()

  if (fetchError || !store) {
    throw new Error('Loja não encontrada ou acesso negado.')
  }

  const currentSettings = (store.settings as Record<string, unknown>) || {}
  const newSettings = { ...currentSettings, manual_closure: isClosed }

  const { data, error: updateError } = await supabase
    .from('stores')
    .update({ settings: newSettings as unknown as Json })
    .eq('id', storeId)
    .select()
    .single()

  if (updateError) {
    throw new Error(`Erro ao alterar o status da loja: ${updateError.message}`)
  }

  return data as unknown as Store
}
