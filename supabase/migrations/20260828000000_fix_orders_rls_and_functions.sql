-- ==============================================================================
-- Migration: Correção de Políticas RLS para Pedidos (Orders) e Funções Auxiliares
-- ==============================================================================

-- 1. Habilitar RLS (caso ainda não esteja)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas/conflitantes de orders
DROP POLICY IF EXISTS "Qualquer cliente pode criar pedidos" ON orders;
DROP POLICY IF EXISTS "Qualquer cliente pode visualizar pedidos" ON orders;
DROP POLICY IF EXISTS "Clientes podem visualizar pedidos" ON orders;
DROP POLICY IF EXISTS "Proprietários podem gerenciar pedidos de suas lojas" ON orders;

-- 3. Criar políticas atualizadas para orders
-- Proprietários da loja têm acesso total
CREATE POLICY "Proprietários podem gerenciar pedidos de suas lojas"
    ON orders FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- Clientes públicos/anônimos podem inserir pedidos em lojas ativas
CREATE POLICY "Qualquer cliente pode criar pedidos"
    ON orders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.is_active = true
        )
    );

-- Clientes podem visualizar pedidos (necessário para .insert().select() e para tela de confirmação /[slug]/order/[id])
CREATE POLICY "Qualquer cliente pode visualizar pedidos"
    ON orders FOR SELECT
    USING (true);


-- 4. Limpar políticas antigas/conflitantes de order_items
DROP POLICY IF EXISTS "Proprietários podem gerenciar itens dos pedidos de suas lojas" ON order_items;
DROP POLICY IF EXISTS "Qualquer cliente pode inserir itens de pedido" ON order_items;
DROP POLICY IF EXISTS "Qualquer cliente pode visualizar itens de pedidos" ON order_items;

-- 5. Criar políticas atualizadas para order_items
-- Proprietários têm acesso total aos itens dos pedidos de suas lojas
CREATE POLICY "Proprietários podem gerenciar itens dos pedidos de suas lojas"
    ON order_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            JOIN stores ON stores.id = orders.store_id
            WHERE orders.id = order_items.order_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            JOIN stores ON stores.id = orders.store_id
            WHERE orders.id = order_items.order_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- Clientes públicos/anônimos podem inserir itens associados a pedidos
CREATE POLICY "Qualquer cliente pode inserir itens de pedido"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
        )
    );

-- Clientes podem visualizar os itens dos pedidos
CREATE POLICY "Qualquer cliente pode visualizar itens de pedidos"
    ON order_items FOR SELECT
    USING (true);


-- 6. Atualizar função deduct_drop_item_stock com SECURITY DEFINER
-- Permite abater estoque atômico de drop_items durante o checkout anônimo
CREATE OR REPLACE FUNCTION deduct_drop_item_stock(
    p_drop_item_id UUID,
    p_quantity INTEGER
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allocated INTEGER;
    v_sold INTEGER;
    v_drop_id UUID;
    v_remaining INTEGER;
BEGIN
    -- Bloqueia a linha para evitar Race Conditions
    SELECT allocated_quantity, sold_quantity, drop_id
    INTO v_allocated, v_sold, v_drop_id
    FROM drop_items
    WHERE id = p_drop_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item do drop não encontrado.';
    END IF;

    IF (v_allocated - v_sold) < p_quantity THEN
        RAISE EXCEPTION 'Estoque insuficiente para este item no drop.';
    END IF;

    UPDATE drop_items
    SET sold_quantity = sold_quantity + p_quantity,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = p_drop_item_id;

    -- Verifica se todos os itens do drop esgotaram para atualizar o status do drop automaticamente
    SELECT SUM(allocated_quantity - sold_quantity)
    INTO v_remaining
    FROM drop_items
    WHERE drop_id = v_drop_id AND is_active = true;

    IF v_remaining <= 0 THEN
        UPDATE drops
        SET status = 'sold_out',
            updated_at = TIMEZONE('utc'::text, NOW())
        WHERE id = v_drop_id AND status = 'active';
    END IF;

    RETURN TRUE;
END;
$$;


-- 7. Atualizar função set_store_order_number com SECURITY DEFINER
CREATE OR REPLACE FUNCTION set_store_order_number()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_num INTEGER;
BEGIN
    IF NEW.order_number IS NULL THEN
        SELECT COALESCE(MAX(order_number), 1000) + 1
        INTO next_num
        FROM orders
        WHERE store_id = NEW.store_id;

        NEW.order_number = next_num;
    END IF;
    RETURN NEW;
END;
$$;


-- 8. Conceder permissões (GRANTs) explícitas para as roles do Supabase
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE orders TO anon, authenticated;
GRANT ALL ON TABLE orders TO authenticated, service_role;
GRANT SELECT, INSERT ON TABLE order_items TO anon, authenticated;
GRANT ALL ON TABLE order_items TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deduct_drop_item_stock(UUID, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION set_store_order_number() TO anon, authenticated, service_role;
