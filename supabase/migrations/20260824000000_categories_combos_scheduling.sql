-- ==============================================================================
-- Migration: Categorias, Pronta-Entrega/Encomendas, Combos e Agendamento
-- ==============================================================================

-- 1. Tabela: categories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Triggers de atualização automática para categories
DROP TRIGGER IF EXISTS trigger_categories_updated_at ON categories;
CREATE TRIGGER trigger_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para categories
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(store_id, sort_order);

-- RLS para categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Categorias de lojas ativas são visíveis publicamente" ON categories;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Proprietários podem gerenciar categorias de suas lojas" ON categories;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;


-- 2. Atualização da Tabela: products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'ready_delivery' CHECK (sale_type IN ('ready_delivery', 'order')),
    ADD COLUMN IF NOT EXISTS lead_time_days INT DEFAULT 0 CHECK (lead_time_days >= 0);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sale_type ON products(store_id, sale_type);


-- 3. Tabela: combos
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

-- Triggers de atualização automática para combos
DROP TRIGGER IF EXISTS trigger_combos_updated_at ON combos;
CREATE TRIGGER trigger_combos_updated_at
    BEFORE UPDATE ON combos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para combos
CREATE INDEX IF NOT EXISTS idx_combos_store_id ON combos(store_id);
CREATE INDEX IF NOT EXISTS idx_combos_active ON combos(store_id, active);

-- RLS para combos
ALTER TABLE combos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Combos ativos são visíveis publicamente" ON combos;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Proprietários podem gerenciar combos de suas lojas" ON combos;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;


-- 4. Tabela: combo_rules
CREATE TABLE IF NOT EXISTS combo_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    combo_id UUID NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    required_quantity INT NOT NULL CHECK (required_quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para combo_rules
CREATE INDEX IF NOT EXISTS idx_combo_rules_combo_id ON combo_rules(combo_id);
CREATE INDEX IF NOT EXISTS idx_combo_rules_category_id ON combo_rules(category_id);

-- RLS para combo_rules
ALTER TABLE combo_rules ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Regras de combos visíveis publicamente" ON combo_rules;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Proprietários podem gerenciar regras de combos de suas lojas" ON combo_rules;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;


-- 5. Atualização da Tabela: orders
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS scheduled_date DATE,
    ADD COLUMN IF NOT EXISTS scheduled_time_slot TEXT,
    ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'delivery' CHECK (delivery_method IN ('delivery', 'pickup')),
    ADD COLUMN IF NOT EXISTS production_status TEXT DEFAULT 'pending' CHECK (production_status IN ('pending', 'preparing', 'ready', 'delivered'));

CREATE INDEX IF NOT EXISTS idx_orders_scheduled_date ON orders(store_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_orders_production_status ON orders(store_id, production_status);


-- 6. Permissões de Acesso (GRANTs para roles do Supabase)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE categories TO anon, authenticated, service_role;
GRANT ALL ON TABLE combos TO anon, authenticated, service_role;
GRANT ALL ON TABLE combo_rules TO anon, authenticated, service_role;
GRANT ALL ON TABLE products TO anon, authenticated, service_role;
GRANT ALL ON TABLE orders TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

