-- ==============================================================================
-- Migration: Horário de Funcionamento e Perguntas Frequentes (FAQ)
-- ==============================================================================

-- 1. Adicionar coluna business_hours na tabela stores
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{
        "monday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "tuesday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "wednesday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "thursday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "friday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "saturday": { "isOpen": true, "open": "10:00", "close": "18:00" },
        "sunday": { "isOpen": false, "open": "", "close": "" }
    }'::jsonb;

-- 2. Criar a tabela faqs
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    "order" INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Índices para faqs
CREATE INDEX IF NOT EXISTS idx_faqs_store_id ON faqs(store_id);
CREATE INDEX IF NOT EXISTS idx_faqs_order ON faqs(store_id, "order");

-- 4. Habilitar RLS para faqs
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "FAQs de lojas ativas são visíveis publicamente" ON faqs;
    CREATE POLICY "FAQs de lojas ativas são visíveis publicamente"
        ON faqs FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM stores 
                WHERE stores.id = faqs.store_id 
                AND stores.is_active = true
            )
        );
EXCEPTION WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Proprietários podem gerenciar FAQs de suas lojas" ON faqs;
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
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- 5. Permissões de Acesso (GRANTs)
GRANT ALL ON TABLE faqs TO anon, authenticated, service_role;
