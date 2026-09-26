-- ==============================================================================
-- AppDrops MVP - Database Schema (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- 2. TIPOS CUSTOMIZADOS (ENUMS)

-- Status do Drop
DO $$ BEGIN
    CREATE TYPE drop_status AS ENUM (
        'draft',             -- Rascunho / em configuração
        'scheduled',         -- Agendado (com data futura de abertura)
        'active',            -- Ativo / aberto para pedidos
        'paused',            -- Pausado temporariamente
        'ended',             -- Encerrado por prazo
        'sold_out'           -- Esgotado (estoque do drop zerado)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Tipo de Chave PIX
DO $$ BEGIN
    CREATE TYPE pix_key_type AS ENUM (
        'cpf',
        'cnpj',
        'email',
        'phone',
        'random'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status do Pedido
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',           -- Pedido recebido / aguardando confirmação
        'confirmed',         -- Confirmado pela loja
        'preparing',         -- Em preparo / separação
        'ready_for_pickup',  -- Pronto para retirada
        'out_for_delivery',  -- Saiu para entrega
        'delivered',         -- Entregue / Finalizado
        'cancelled'          -- Cancelado
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Método de Pagamento
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'pix',
        'credit_card',
        'debit_card',
        'cash',
        'on_delivery',
        'whatsapp'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status do Pagamento
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'paid',
        'failed',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Modalidade de Entrega
DO $$ BEGIN
    CREATE TYPE delivery_type AS ENUM (
        'delivery',
        'pickup',
        'dine_in'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 3. FUNÇÕES AUXILIARES

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função atômica e segura para geração de order_number sequencial por loja (#1001, #1002...)
CREATE OR REPLACE FUNCTION next_order_number(p_store_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_current_max INTEGER;
    v_next INTEGER;
BEGIN
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

-- Função trigger para definir número do pedido sequencial caso não seja informado
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

-- Função segura para consulta de pedido por idempotency_key
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

-- Função para abater estoque de item em Drop com segurança atômica (concorrência)
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


-- 4. TABELAS

-- 4.1. Lojas (Multi-tenant & Configurações de PIX)
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#000000',
    phone VARCHAR(30),
    whatsapp_number VARCHAR(30) NOT NULL,
    
    -- Configurações de Chave PIX do Lojista (para geração de QR Code / Copia e Cola)
    pix_key_type pix_key_type,
    pix_key VARCHAR(255),
    pix_merchant_name VARCHAR(255),
    pix_merchant_city VARCHAR(255),

    currency VARCHAR(10) DEFAULT 'BRL',
    business_hours JSONB DEFAULT '{
        "monday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "tuesday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "wednesday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "thursday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "friday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "saturday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "sunday": { "isOpen": false, "open": "", "close": "" }
    }'::jsonb,
    settings JSONB DEFAULT '{
        "opening_hours": {},
        "min_order_value": 0,
        "delivery_fee": 0,
        "allow_pickup": true,
        "allow_delivery": true
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4.2. Categorias
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4.3. Catálogo Base de Produtos
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    promotional_price DECIMAL(10,2) CHECK (promotional_price >= 0),
    image_url TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    sku VARCHAR(100),
    track_stock BOOLEAN DEFAULT false,
    stock_quantity INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    sale_type TEXT DEFAULT 'ready_delivery' CHECK (sale_type IN ('ready_delivery', 'order', 'both')),
    allow_ready_delivery BOOLEAN DEFAULT true NOT NULL,
    allow_order BOOLEAN DEFAULT false NOT NULL,
    different_prices_by_mode BOOLEAN DEFAULT false NOT NULL,
    price_ready_delivery DECIMAL(10,2) CHECK (price_ready_delivery >= 0),
    price_order DECIMAL(10,2) CHECK (price_order >= 0),
    lead_time_days INTEGER DEFAULT 0 CHECK (lead_time_days >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT check_at_least_one_modality CHECK (allow_ready_delivery = true OR allow_order = true)
);

-- 4.4. Drops (Lotes / Lançamentos com Estoque e Tempo Limitados)
CREATE TABLE IF NOT EXISTS drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    banner_url TEXT,
    status drop_status DEFAULT 'draft' NOT NULL,
    starts_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    max_orders INTEGER CHECK (max_orders > 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_store_drop_slug UNIQUE (store_id, slug)
);

-- 4.5. Itens do Drop (com controle de estoque alocado especificamente para o Drop)
CREATE TABLE IF NOT EXISTS drop_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2) CHECK (custom_price >= 0),         -- Preço especial no drop (opcional)
    promotional_price DECIMAL(10,2) CHECK (promotional_price >= 0), -- Preço promocional no drop (opcional)
    allocated_quantity INTEGER NOT NULL CHECK (allocated_quantity >= 0), -- Estoque total exclusivo alocado para o drop
    sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),  -- Quantidade já vendida no drop
    max_per_order INTEGER CHECK (max_per_order > 0),                     -- Limite por pedido no drop (opcional)
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_drop_product UNIQUE (drop_id, product_id),
    CONSTRAINT check_sold_not_exceed_allocated CHECK (sold_quantity <= allocated_quantity)
);

-- 4.6. Pedidos (Suporta compras da vitrine geral ou vinculadas a um Drop)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    drop_id UUID REFERENCES drops(id) ON DELETE SET NULL, -- Identifica se o pedido foi originado de um Drop
    order_number INTEGER NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(30) NOT NULL,
    customer_email VARCHAR(255),
    delivery_type delivery_type DEFAULT 'delivery' NOT NULL,
    delivery_address JSONB DEFAULT '{}'::jsonb, -- { street, number, neighborhood, city, state, zip_code, complement, reference }
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    delivery_fee DECIMAL(10,2) DEFAULT 0 CHECK (delivery_fee >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    payment_method payment_method NOT NULL,
    payment_status payment_status DEFAULT 'pending' NOT NULL,
    status order_status DEFAULT 'pending' NOT NULL,
    scheduled_date DATE,
    scheduled_time_slot TEXT,
    delivery_method TEXT DEFAULT 'delivery' CHECK (delivery_method IN ('delivery', 'pickup')),
    production_status TEXT DEFAULT 'pending' CHECK (production_status IN ('pending', 'preparing', 'ready', 'delivered')),
    idempotency_key UUID,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_store_order_number UNIQUE (store_id, order_number)
);

-- 4.7. Itens do Pedido
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    drop_item_id UUID REFERENCES drop_items(id) ON DELETE SET NULL, -- Vincula ao item do drop (se aplicável)
    product_name VARCHAR(255) NOT NULL,
    product_image_url TEXT,
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    notes TEXT,
    customizations JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4.8. Combos Customizáveis
CREATE TABLE IF NOT EXISTS combos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    sale_type TEXT DEFAULT 'order' CHECK (sale_type IN ('ready_delivery', 'order')),
    image_url TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4.9. Regras de Itens por Categoria para Combos
CREATE TABLE IF NOT EXISTS combo_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    required_quantity INT NOT NULL CHECK (required_quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4.10. Perguntas Frequentes (FAQ)
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    "order" INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);


-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);

CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(store_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sale_type ON products(store_id, sale_type);
CREATE INDEX IF NOT EXISTS idx_products_modalities ON products(store_id, allow_ready_delivery, allow_order);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(store_id, is_active);

CREATE INDEX IF NOT EXISTS idx_combos_store_id ON combos(store_id);
CREATE INDEX IF NOT EXISTS idx_combos_active ON combos(store_id, active);

CREATE INDEX IF NOT EXISTS idx_combo_rules_combo_id ON combo_rules(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_rules_category_id ON combo_rules(category_id);

CREATE INDEX IF NOT EXISTS idx_faqs_store_id ON faqs(store_id);
CREATE INDEX IF NOT EXISTS idx_faqs_order ON faqs(store_id, "order");

CREATE INDEX IF NOT EXISTS idx_drops_store_id ON drops(store_id);
CREATE INDEX IF NOT EXISTS idx_drops_slug ON drops(store_id, slug);
CREATE INDEX IF NOT EXISTS idx_drops_status ON drops(store_id, status);

CREATE INDEX IF NOT EXISTS idx_drop_items_drop_id ON drop_items(drop_id);
CREATE INDEX IF NOT EXISTS idx_drop_items_product_id ON drop_items(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_store_id ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_drop_id ON orders(drop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders(store_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_orders_production_status ON orders(store_id, production_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_store_idempotency ON orders (store_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_drop_item_id ON order_items(drop_item_id);


-- 6. TRIGGERS

-- Triggers para atualização automática de updated_at
DROP TRIGGER IF EXISTS trigger_stores_updated_at ON stores;
CREATE TRIGGER trigger_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_combos_updated_at ON combos;
CREATE TRIGGER trigger_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_products_updated_at ON products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_drops_updated_at ON drops;
CREATE TRIGGER trigger_drops_updated_at
    BEFORE UPDATE ON drops
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_drop_items_updated_at ON drop_items;
CREATE TRIGGER trigger_drop_items_updated_at
    BEFORE UPDATE ON drop_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para definir número do pedido sequencial por loja (#1001, #1002...)
DROP TRIGGER IF EXISTS trigger_set_order_number ON orders;
CREATE TRIGGER trigger_set_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW EXECUTE FUNCTION set_store_order_number();


-- 7. ROW LEVEL SECURITY (RLS)

-- Habilitar RLS em todas as tabelas
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE drops ENABLE ROW LEVEL SECURITY;
ALTER TABLE drop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 7.1. Políticas de Segurança: stores
CREATE POLICY "Lojas ativas são visíveis publicamente"
    ON stores FOR SELECT
    USING (is_active = true);

CREATE POLICY "Proprietários podem ver todas as suas lojas"
    ON stores FOR SELECT
    TO authenticated
    USING (owner_id = auth.uid());

CREATE POLICY "Usuários autenticados podem criar lojas"
    ON stores FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Proprietários podem atualizar suas lojas"
    ON stores FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Proprietários podem deletar suas lojas"
    ON stores FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- 7.2. Políticas de Segurança: categories
CREATE POLICY "Categorias de lojas ativas são visíveis publicamente"
    ON categories FOR SELECT
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = categories.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar categorias de suas lojas"
    ON categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = categories.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = categories.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.3. Políticas de Segurança: products
CREATE POLICY "Produtos ativos de lojas ativas são visíveis publicamente"
    ON products FOR SELECT
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar produtos de suas lojas"
    ON products FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = products.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.4. Políticas de Segurança: drops
CREATE POLICY "Drops visíveis para o público de lojas ativas"
    ON drops FOR SELECT
    USING (
        is_active = true 
        AND status IN ('scheduled', 'active', 'paused', 'ended', 'sold_out')
        AND EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = drops.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar drops de suas lojas"
    ON drops FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = drops.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = drops.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.5. Políticas de Segurança: drop_items
CREATE POLICY "Itens do drop visíveis publicamente"
    ON drop_items FOR SELECT
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM drops
            JOIN stores ON stores.id = drops.store_id
            WHERE drops.id = drop_items.drop_id
            AND drops.is_active = true
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar itens de seus drops"
    ON drop_items FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM drops
            JOIN stores ON stores.id = drops.store_id
            WHERE drops.id = drop_items.drop_id
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM drops
            JOIN stores ON stores.id = drops.store_id
            WHERE drops.id = drop_items.drop_id
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.6. Políticas de Segurança: orders
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

CREATE POLICY "Qualquer cliente pode criar pedidos"
    ON orders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = orders.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Qualquer cliente pode visualizar pedidos"
    ON orders FOR SELECT
    USING (true);

-- 7.7. Políticas de Segurança: order_items
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

CREATE POLICY "Qualquer cliente pode inserir itens de pedido"
    ON order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
        )
    );

CREATE POLICY "Qualquer cliente pode visualizar itens de pedidos"
    ON order_items FOR SELECT
    USING (true);

-- 7.8. Políticas de Segurança: combos
CREATE POLICY "Combos ativos são visíveis publicamente"
    ON combos FOR SELECT
    USING (
        active = true 
        AND EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = combos.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar combos de suas lojas"
    ON combos FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = combos.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = combos.store_id 
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.9. Políticas de Segurança: combo_rules
CREATE POLICY "Regras de combos visíveis publicamente"
    ON combo_rules FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM combos
            JOIN stores ON stores.id = combos.store_id
            WHERE combos.id = combo_rules.combo_id
            AND combos.active = true
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar regras de combos de suas lojas"
    ON combo_rules FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM combos
            JOIN stores ON stores.id = combos.store_id
            WHERE combos.id = combo_rules.combo_id
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM combos
            JOIN stores ON stores.id = combos.store_id
            WHERE combos.id = combo_rules.combo_id
            AND stores.owner_id = auth.uid()
        )
    );

-- 7.10. Políticas de Segurança: faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs de lojas ativas são visíveis publicamente"
    ON faqs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = faqs.store_id 
            AND stores.is_active = true
        )
    );

CREATE POLICY "Proprietários podem gerenciar FAQs de suas lojas"
    ON faqs FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = faqs.store_id 
            AND stores.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM stores 
            WHERE stores.id = faqs.store_id 
            AND stores.owner_id = auth.uid()
        )
    );


-- 8. SUPABASE REALTIME
-- Habilitar Realtime para pedidos e drops/itens (atualização em tempo real de pedidos e estoque)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'drops'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE drops;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'drop_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE drop_items;
    END IF;
END $$;


-- 9. SUPABASE STORAGE (BUCKETS & POLICIES)
INSERT INTO storage.buckets (id, name, public)
VALUES 
    ('store-assets', 'store-assets', true),
    ('product-images', 'product-images', true),
    ('drop-banners', 'drop-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage
CREATE POLICY "Imagens públicas de lojas, produtos e drops"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('store-assets', 'product-images', 'drop-banners'));

CREATE POLICY "Proprietários autenticados podem fazer upload de assets"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id IN ('store-assets', 'product-images', 'drop-banners'));

CREATE POLICY "Proprietários autenticados podem atualizar seus assets"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id IN ('store-assets', 'product-images', 'drop-banners'));

CREATE POLICY "Proprietários autenticados podem deletar seus assets"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id IN ('store-assets', 'product-images', 'drop-banners'));


-- 10. PERMISSÕES DE ACESSO (GRANTS)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

