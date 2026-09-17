-- ==============================================================================
-- Migration: Suporte a Múltiplas Modalidades e Preços Diferenciados em Produtos
-- ==============================================================================

-- 1. Adicionar novas colunas na tabela products
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS allow_ready_delivery BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS allow_order BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS different_prices_by_mode BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS price_ready_delivery DECIMAL(10,2) CHECK (price_ready_delivery >= 0),
    ADD COLUMN IF NOT EXISTS price_order DECIMAL(10,2) CHECK (price_order >= 0);

-- 2. Backfill dos dados existentes a partir da coluna sale_type
UPDATE products
SET 
    allow_ready_delivery = CASE 
        WHEN sale_type = 'order' THEN false 
        ELSE true 
    END,
    allow_order = CASE 
        WHEN sale_type = 'order' THEN true 
        ELSE false 
    END
WHERE (sale_type IS NOT NULL);

-- 3. Atualizar a constraint da coluna legada sale_type para aceitar 'both'
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sale_type_check;
ALTER TABLE products ADD CONSTRAINT products_sale_type_check CHECK (sale_type IN ('ready_delivery', 'order', 'both'));

-- 4. Constraint de garantia: ao menos uma modalidade de venda deve estar ativa
DO $$ BEGIN
    ALTER TABLE products
        ADD CONSTRAINT check_at_least_one_modality 
        CHECK (allow_ready_delivery = true OR allow_order = true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Índice para otimização de filtros por modalidade
CREATE INDEX IF NOT EXISTS idx_products_modalities ON products(store_id, allow_ready_delivery, allow_order);

