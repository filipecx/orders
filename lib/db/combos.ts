import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import type {
  Combo,
  ComboInput,
  ComboUpdate,
  ComboWithRules,
} from '@/lib/domain/combos'

/**
 * Lista todos os combos de uma loja com suas respectivas regras de itens por categoria.
 */
export async function listCombosByStore(
  explicitStoreId?: string,
  onlyActive = false
): Promise<ComboWithRules[]> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) return []
    storeId = store.id
  }

  try {
    let query = supabase
      .from('combos')
      .select(`
        *,
        rules:combo_rules(
          *,
          category:categories(*)
        )
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })

    if (onlyActive) {
      query = query.eq('active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error(
        '[lib/db/combos.ts] Erro ao listar combos:',
        error.message || error.details || JSON.stringify(error)
      )
      return []
    }

    return (data as unknown as ComboWithRules[]) ?? []
  } catch (err) {
    console.error('[lib/db/combos.ts] Exceção ao listar combos:', err)
    return []
  }
}

/**
 * Busca um combo específico com suas regras pelo ID.
 */
export async function getComboById(comboId: string): Promise<ComboWithRules | null> {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        rules:combo_rules(
          *,
          category:categories(*)
        )
      `)
      .eq('id', comboId)
      .maybeSingle()

    if (error) {
      console.error(
        '[lib/db/combos.ts] Erro ao buscar combo por ID:',
        error.message || error.details || JSON.stringify(error)
      )
      return null
    }

    return (data as unknown as ComboWithRules) ?? null
  } catch (err) {
    console.error('[lib/db/combos.ts] Exceção ao buscar combo:', err)
    return null
  }
}

/**
 * Cria um novo combo e cadastra suas regras de itens obrigatórios por categoria.
 */
export async function createCombo(
  input: ComboInput,
  explicitStoreId?: string
): Promise<ComboWithRules> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  // 1. Inserir o Combo
  const { data: combo, error: comboError } = await supabase
    .from('combos')
    .insert({
      store_id: storeId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      sale_type: input.sale_type ?? 'order',
      image_url: input.image_url && input.image_url.length > 0 ? input.image_url : null,
      active: input.active ?? true,
    })
    .select()
    .single()

  if (comboError || !combo) {
    console.error('[lib/db/combos.ts] Erro ao criar combo:', comboError?.message || comboError)
    throw new Error(`Erro ao criar combo: ${comboError?.message || 'Verifique se a migration do banco foi executada.'}`)
  }

  // 2. Inserir as Regras do Combo (se houver)
  if (input.rules && input.rules.length > 0) {
    const rulesPayload = input.rules.map((rule) => ({
      combo_id: combo.id,
      category_id: rule.category_id,
      required_quantity: rule.required_quantity,
    }))

    const { error: rulesError } = await supabase
      .from('combo_rules')
      .insert(rulesPayload)

    if (rulesError) {
      console.error('[lib/db/combos.ts] Erro ao cadastrar regras do combo:', rulesError?.message || rulesError)
      throw new Error(`Erro ao cadastrar regras do combo: ${rulesError.message}`)
    }
  }

  // Retornar combo completo com regras
  const fullCombo = await getComboById(combo.id)
  if (!fullCombo) {
    throw new Error('Falha ao recuperar dados do combo recém-criado.')
  }

  return fullCombo
}

/**
 * Atualiza um combo e suas regras de itens da loja autenticada.
 */
export async function updateCombo(
  comboId: string,
  input: Partial<ComboInput>,
  explicitStoreId?: string
): Promise<ComboWithRules> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const updatePayload: ComboUpdate = {}

  if (input.name !== undefined) updatePayload.name = input.name
  if (input.description !== undefined) updatePayload.description = input.description
  if (input.price !== undefined) updatePayload.price = input.price
  if (input.sale_type !== undefined) updatePayload.sale_type = input.sale_type
  if (input.image_url !== undefined) updatePayload.image_url = input.image_url && input.image_url.length > 0 ? input.image_url : null
  if (input.active !== undefined) updatePayload.active = input.active

  // 1. Atualiza dados do combo verificando se pertence à loja
  const { data: updatedCombo, error: comboError } = await supabase
    .from('combos')
    .update(updatePayload)
    .eq('id', comboId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (comboError || !updatedCombo) {
    console.error('[lib/db/combos.ts] Erro ao atualizar combo:', comboError?.message || comboError)
    throw new Error(`Erro ao atualizar combo: ${comboError?.message || 'Combo não encontrado ou não autorizado'}`)
  }

  // 2. Se regras foram fornecidas, sincroniza removendo as antigas e inserindo as novas
  if (input.rules !== undefined) {
    const { error: deleteRulesError } = await supabase
      .from('combo_rules')
      .delete()
      .eq('combo_id', comboId)

    if (deleteRulesError) {
      console.error('[lib/db/combos.ts] Erro ao atualizar regras antigas do combo:', deleteRulesError?.message || deleteRulesError)
      throw new Error(`Erro ao atualizar regras do combo: ${deleteRulesError.message}`)
    }

    if (input.rules.length > 0) {
      const rulesPayload = input.rules.map((rule) => ({
        combo_id: comboId,
        category_id: rule.category_id,
        required_quantity: rule.required_quantity,
      }))

      const { error: insertRulesError } = await supabase
        .from('combo_rules')
        .insert(rulesPayload)

      if (insertRulesError) {
        console.error('[lib/db/combos.ts] Erro ao salvar novas regras do combo:', insertRulesError?.message || insertRulesError)
        throw new Error(`Erro ao salvar novas regras do combo: ${insertRulesError.message}`)
      }
    }
  }

  const fullCombo = await getComboById(comboId)
  if (!fullCombo) {
    throw new Error('Falha ao recuperar dados do combo atualizado.')
  }

  return fullCombo
}

/**
 * Ativa ou desativa um combo da loja autenticada.
 */
export async function toggleComboStatus(
  comboId: string,
  active: boolean,
  explicitStoreId?: string
): Promise<Combo> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const { data, error } = await supabase
    .from('combos')
    .update({ active })
    .eq('id', comboId)
    .eq('store_id', storeId)
    .select()
    .single()

  if (error || !data) {
    console.error('[lib/db/combos.ts] Erro ao alterar status do combo:', error?.message || error)
    throw new Error(`Erro ao alterar status do combo: ${error?.message || 'Combo não encontrado ou não autorizado'}`)
  }

  return data
}

/**
 * Remove um combo (e suas regras associadas) da loja autenticada.
 */
export async function deleteCombo(
  comboId: string,
  explicitStoreId?: string
): Promise<void> {
  const supabase = await createClient()

  let storeId = explicitStoreId
  if (!storeId) {
    const store = await getStoreByOwner()
    if (!store) {
      throw new Error('Nenhuma loja encontrada para o usuário autenticado.')
    }
    storeId = store.id
  }

  const { error } = await supabase
    .from('combos')
    .delete()
    .eq('id', comboId)
    .eq('store_id', storeId)

  if (error) {
    console.error('[lib/db/combos.ts] Erro ao excluir combo:', error?.message || error)
    throw new Error(`Erro ao excluir combo: ${error.message}`)
  }
}
