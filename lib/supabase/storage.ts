import { createClient } from '@/lib/supabase/client'

export type StorageBucket = 'stores-media' | 'products-media'

/**
 * Faz o upload de um arquivo para o Supabase Storage e retorna sua URL pública acessível.
 *
 * @param file Arquivo a ser enviado (preferencialmente já otimizado/comprimido)
 * @param bucket Nome do bucket do Supabase Storage ('stores-media' ou 'products-media')
 * @param pathPrefix Prefixo de pasta opcional (ex: 'logos', 'banners', 'products', 'combos')
 * @returns URL pública permanente da imagem
 */
export async function uploadImage(
  file: File,
  bucket: StorageBucket,
  pathPrefix?: string
): Promise<string> {
  const supabase = createClient()

  // Gera sufixo aleatório e timestamp para garantir nome de arquivo 100% único
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)

  // Sanitiza o nome original removendo caracteres especiais e acentos
  const cleanName = file.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/\.[^/.]+$/, '') // Remove extensão original

  const extension = file.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'webp')
  const fileName = `${timestamp}-${randomSuffix}-${cleanName}.${extension}`

  const cleanPrefix = pathPrefix ? pathPrefix.replace(/^\/+|\/+$/g, '') : ''
  const filePath = cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      contentType: file.type || 'image/webp',
      cacheControl: '31536000', // 1 ano de cache
      upsert: false,
    })

  if (error || !data) {
    console.error(`[uploadImage] Erro ao enviar imagem para o bucket '${bucket}':`, error)
    throw new Error(`Erro ao fazer upload da imagem: ${error?.message || 'Falha desconhecida'}`)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(data.path)

  return publicUrl
}

/**
 * Remove um arquivo do bucket a partir de sua URL pública ou caminho relativo.
 */
export async function deleteImage(
  bucket: StorageBucket,
  pathOrUrl: string
): Promise<boolean> {
  try {
    const supabase = createClient()

    let relativePath = pathOrUrl
    if (pathOrUrl.startsWith('http')) {
      const parts = pathOrUrl.split(`/${bucket}/`)
      if (parts.length > 1) {
        relativePath = parts[1]
      }
    }

    const { error } = await supabase.storage
      .from(bucket)
      .remove([relativePath])

    if (error) {
      console.warn(`[deleteImage] Aviso ao remover arquivo '${relativePath}' do bucket '${bucket}':`, error)
      return false
    }

    return true
  } catch (err) {
    console.warn('[deleteImage] Exceção ao remover arquivo:', err)
    return false
  }
}
