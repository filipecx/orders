-- ==============================================================================
-- Migration: Security Hardening - RLS de Pedidos, Storage e Funções Seguras
-- ==============================================================================

-- 1. CORREÇÃO DE POLÍTICAS RLS EM ORDERS (Revoga leitura irrestrita)
DROP POLICY IF EXISTS "Qualquer cliente pode visualizar pedidos" ON orders;
DROP POLICY IF EXISTS "Clientes podem visualizar pedidos" ON orders;
DROP POLICY IF EXISTS "Proprietários podem visualizar pedidos de suas lojas" ON orders;

CREATE POLICY "Proprietários podem visualizar pedidos de suas lojas"
    ON orders FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 2. CORREÇÃO DE POLÍTICAS RLS EM ORDER_ITEMS (Revoga leitura irrestrita)
DROP POLICY IF EXISTS "Qualquer cliente pode visualizar itens de pedidos" ON order_items;
DROP POLICY IF EXISTS "Proprietários podem visualizar itens dos pedidos de suas lojas" ON order_items;

CREATE POLICY "Proprietários podem visualizar itens dos pedidos de suas lojas"
    ON order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            JOIN stores ON stores.id = orders.store_id
            WHERE orders.id = order_items.order_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 3. FUNÇÃO SEGURA COM SECURITY DEFINER PARA CONSULTA DE PEDIDO ESPECÍFICO POR UUID
-- Permite que o cliente visualize seu pedido recém-criado na tela de confirmação /[slug]/order/[id]
-- sem dar permissão de varredura ou SELECT amplo na tabela orders inteira.
CREATE OR REPLACE FUNCTION get_order_by_id_public(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', o.id,
        'order_number', o.order_number,
        'store_id', o.store_id,
        'drop_id', o.drop_id,
        'customer_name', o.customer_name,
        'customer_phone', o.customer_phone,
        'customer_email', o.customer_email,
        'delivery_type', o.delivery_type,
        'delivery_method', o.delivery_method,
        'delivery_address', o.delivery_address,
        'scheduled_date', o.scheduled_date,
        'scheduled_time_slot', o.scheduled_time_slot,
        'production_status', o.production_status,
        'subtotal', o.subtotal,
        'delivery_fee', o.delivery_fee,
        'discount', o.discount,
        'total', o.total,
        'payment_method', o.payment_method,
        'payment_status', o.payment_status,
        'status', o.status,
        'notes', o.notes,
        'created_at', o.created_at,
        'updated_at', o.updated_at,
        'items', COALESCE((
            SELECT jsonb_agg(to_jsonb(oi))
            FROM order_items oi
            WHERE oi.order_id = o.id
        ), '[]'::jsonb),
        'store', to_jsonb(s)
    )
    INTO v_order
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = p_order_id;

    RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION get_order_by_id_public(UUID) TO anon, authenticated, service_role;

-- 4. CORREÇÃO DE POLÍTICAS DE SUPABASE STORAGE (Revoga permissões públicas perigosas)
DROP POLICY IF EXISTS "Allow Media Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Delete" ON storage.objects;

-- Apenas usuários autenticados podem inserir arquivos nos buckets de mídia
CREATE POLICY "Proprietários autenticados podem enviar imagens"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));

-- Apenas usuários autenticados podem atualizar arquivos existentes
CREATE POLICY "Proprietários autenticados podem atualizar imagens"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));

-- Apenas usuários autenticados podem deletar arquivos
CREATE POLICY "Proprietários autenticados podem deletar imagens"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));
