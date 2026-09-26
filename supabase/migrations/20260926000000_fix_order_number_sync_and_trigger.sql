-- ==============================================================================
-- Migration: 20260926000000_fix_order_number_sync_and_trigger.sql
-- Descrição: Sincroniza atomicamente last_order_number com MAX(order_number),
--            previne violação de chave única (unique_store_order_number),
--            atualiza o trigger de pedidos e adiciona RPC de busca por idempotência.
-- ==============================================================================

-- 1. Função atômica e segura para geração de order_number sequencial por loja
-- Garante que o contador nunca fique defasado em relação aos pedidos existentes no banco.
CREATE OR REPLACE FUNCTION next_order_number(p_store_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_max INTEGER;
    v_next INTEGER;
BEGIN
    -- Bloqueio pessimista por linha na tabela stores para serializar chamadas concorrentes
    SELECT GREATEST(
        COALESCE((settings->>'last_order_number')::int, 1000),
        COALESCE((SELECT MAX(order_number) FROM orders WHERE store_id = p_store_id), 1000)
    )
    INTO v_current_max
    FROM stores
    WHERE id = p_store_id
    FOR UPDATE;

    IF v_current_max IS NULL THEN
        v_current_max := 1000;
    END IF;

    v_next := v_current_max + 1;

    -- Salva o novo número em settings->last_order_number
    UPDATE stores
    SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{last_order_number}',
        to_jsonb(v_next)
    )
    WHERE id = p_store_id;

    RETURN v_next;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION next_order_number(UUID) TO anon, authenticated, service_role;

-- 2. Atualizar o trigger de pedidos para usar a lógica unificada
CREATE OR REPLACE FUNCTION set_store_order_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := next_order_number(NEW.store_id);
    END IF;
    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION set_store_order_number() TO anon, authenticated, service_role;

-- 3. Atualizar retroativamente o contador last_order_number de todas as lojas existentes
-- com base no MAX(order_number) real da tabela orders
UPDATE stores s
SET settings = jsonb_set(
    COALESCE(s.settings, '{}'::jsonb),
    '{last_order_number}',
    to_jsonb(GREATEST(
        COALESCE((s.settings->>'last_order_number')::int, 1000),
        COALESCE((SELECT MAX(order_number) FROM orders WHERE store_id = s.id), 1000)
    ))
);

-- 4. Função segura para consulta de pedido por idempotency_key (permitindo checkout idempotente sob RLS)
CREATE OR REPLACE FUNCTION get_order_by_idempotency_key(
    p_store_id UUID,
    p_idempotency_key UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order JSONB;
BEGIN
    SELECT to_jsonb(o)
    INTO v_order
    FROM orders o
    WHERE o.store_id = p_store_id
      AND o.idempotency_key = p_idempotency_key;

    RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_by_idempotency_key(UUID, UUID) TO anon, authenticated, service_role;
