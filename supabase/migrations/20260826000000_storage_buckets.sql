-- ==============================================================================
-- AppDrops - Supabase Storage Buckets & Policies
-- Buckets: 'stores-media' (logos, banners) and 'products-media' (produtos, combos)
-- ==============================================================================

-- 1. Criação dos Buckets Públicos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'stores-media',
        'stores-media',
        true,
        10485760, -- 10MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif']
    ),
    (
        'products-media',
        'products-media',
        true,
        10485760, -- 10MB
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif']
    )
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/avif'];

-- 2. Limpeza de Políticas Anteriores para Evitar Conflitos
DROP POLICY IF EXISTS "Public Access for Stores and Products Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Upload Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Update Media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Users Delete Media" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Update" ON storage.objects;
DROP POLICY IF EXISTS "Allow Media Delete" ON storage.objects;
DROP POLICY IF EXISTS "Imagens públicas de lojas, produtos e drops" ON storage.objects;
DROP POLICY IF EXISTS "Proprietários autenticados podem fazer upload de assets" ON storage.objects;
DROP POLICY IF EXISTS "Proprietários autenticados podem atualizar seus assets" ON storage.objects;
DROP POLICY IF EXISTS "Proprietários autenticados podem deletar seus assets" ON storage.objects;

-- 3. Política de Leitura Pública
CREATE POLICY "Allow Media Public Select"
    ON storage.objects FOR SELECT
    USING (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));

-- 4. Política de Upload (Insert)
CREATE POLICY "Allow Media Insert"
    ON storage.objects FOR INSERT
    TO public
    WITH CHECK (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));

-- 5. Política de Atualização (Update)
CREATE POLICY "Allow Media Update"
    ON storage.objects FOR UPDATE
    TO public
    USING (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));

-- 6. Política de Deleção (Delete)
CREATE POLICY "Allow Media Delete"
    ON storage.objects FOR DELETE
    TO public
    USING (bucket_id IN ('stores-media', 'products-media', 'store-assets', 'product-images', 'drop-banners'));
