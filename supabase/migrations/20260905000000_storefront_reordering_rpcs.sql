-- ==============================================================================
-- Migration: Storefront Organization & Reordering RPCs
-- ==============================================================================

-- 1. ADICIONAR COLUNA sort_order NA TABELA combos CASO NÃO EXISTA
ALTER TABLE combos ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 2. ÍNDICES PARA ORDENAÇÃO RÁPIDA
CREATE INDEX IF NOT EXISTS idx_categories_store_sort ON categories(store_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_store_category_sort ON products(store_id, category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_combos_store_sort ON combos(store_id, sort_order);

-- ==============================================================================
-- RPC 1: reorder_categories
-- Recebe p_store_id e p_items: [{"id": "uuid", "display_order": 0}, ...]
-- ==============================================================================
CREATE OR REPLACE FUNCTION reorder_categories(
    p_store_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_item JSONB;
BEGIN
    -- Checklist Segurança: 1. Validar autenticação
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Checklist Segurança: 2. Validar que auth.uid() é o dono da loja (store_id)
    SELECT owner_id INTO v_owner_id
    FROM stores
    WHERE id = p_store_id;

    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso não autorizado para esta loja';
    END IF;

    -- Checklist Segurança: 3. Filtrar com WHERE store_id em cada instrução
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE categories
        SET sort_order = (v_item->>'display_order')::INT,
            updated_at = NOW()
        WHERE id = (v_item->>'id')::UUID
          AND store_id = p_store_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_items));
END;
$$;

REVOKE ALL ON FUNCTION reorder_categories(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_categories(UUID, JSONB) TO authenticated;

-- ==============================================================================
-- RPC 2: reorder_products
-- Recebe p_store_id e p_items: [{"id": "uuid", "display_order": 0}, ...]
-- ==============================================================================
CREATE OR REPLACE FUNCTION reorder_products(
    p_store_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_item JSONB;
BEGIN
    -- Checklist Segurança: 1. Validar autenticação
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Checklist Segurança: 2. Validar se auth.uid() é o dono da loja
    SELECT owner_id INTO v_owner_id
    FROM stores
    WHERE id = p_store_id;

    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso não autorizado para esta loja';
    END IF;

    -- Checklist Segurança: 3. Filtrar com WHERE store_id em cada instrução
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE products
        SET sort_order = (v_item->>'display_order')::INT,
            updated_at = NOW()
        WHERE id = (v_item->>'id')::UUID
          AND store_id = p_store_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_items));
END;
$$;

REVOKE ALL ON FUNCTION reorder_products(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_products(UUID, JSONB) TO authenticated;

-- ==============================================================================
-- RPC 3: reorder_combos
-- Recebe p_store_id e p_items: [{"id": "uuid", "display_order": 0}, ...]
-- ==============================================================================
CREATE OR REPLACE FUNCTION reorder_combos(
    p_store_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
    v_item JSONB;
BEGIN
    -- Checklist Segurança: 1. Validar autenticação
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Checklist Segurança: 2. Validar se auth.uid() é o dono da loja
    SELECT owner_id INTO v_owner_id
    FROM stores
    WHERE id = p_store_id;

    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso não autorizado para esta loja';
    END IF;

    -- Checklist Segurança: 3. Filtrar com WHERE store_id em cada instrução
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        UPDATE combos
        SET sort_order = (v_item->>'display_order')::INT,
            updated_at = NOW()
        WHERE id = (v_item->>'id')::UUID
          AND store_id = p_store_id;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'count', jsonb_array_length(p_items));
END;
$$;

REVOKE ALL ON FUNCTION reorder_combos(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_combos(UUID, JSONB) TO authenticated;

-- ==============================================================================
-- RPC 4: reorder_storefront_sections
-- Recebe p_store_id e p_sections: ["drops", "combos", "categories"]
-- ==============================================================================
CREATE OR REPLACE FUNCTION reorder_storefront_sections(
    p_store_id UUID,
    p_sections JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    -- Checklist Segurança: 1. Validar autenticação
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Não autenticado';
    END IF;

    -- Checklist Segurança: 2. Validar se auth.uid() é o dono da loja
    SELECT owner_id INTO v_owner_id
    FROM stores
    WHERE id = p_store_id;

    IF v_owner_id IS NULL OR v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Acesso não autorizado para esta loja';
    END IF;

    -- Atualiza as configurações da loja com a nova ordem das seções
    UPDATE stores
    SET settings = jsonb_set(
        COALESCE(settings, '{}'::jsonb),
        '{storefront_sections_order}',
        p_sections
    ),
    updated_at = NOW()
    WHERE id = p_store_id
      AND owner_id = auth.uid();

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION reorder_storefront_sections(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reorder_storefront_sections(UUID, JSONB) TO authenticated;
