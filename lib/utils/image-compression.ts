export interface CompressionOptions {
  maxWidth?: number
  quality?: number
}

/**
 * Comprime e converte uma imagem para o formato WebP utilizando a Canvas API nativa do navegador.
 *
 * @param file Arquivo original de imagem (PNG, JPG, HEIC, WEBP, etc.)
 * @param options Opções de compressão: maxWidth (padrão: 1080px) e quality (padrão: 0.8 / 80%)
 * @returns Promise com o novo File em formato image/webp
 */
export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth = 1080, quality = 0.8 } = options

  // Se não for do tipo imagem, lança erro
  if (!file.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado não é uma imagem válida.')
  }

  // Se for SVG, não requer rasterização em canvas
  if (file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let { width, height } = img

      // Redimensionamento proporcional mantendo a proporção de tela
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback: se contexto 2D não estiver disponível, retorna arquivo original
        resolve(file)
        return
      }

      // Configurações para suavização e alta qualidade gráfica
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }

          // Mantém o nome base do arquivo original e altera a extensão para .webp
          const originalBaseName = file.name.replace(/\.[^/.]+$/, '')
          const webpFile = new File([blob], `${originalBaseName}.webp`, {
            type: 'image/webp',
            lastModified: Date.now(),
          })

          resolve(webpFile)
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Não foi possível carregar e decodificar a imagem selecionada.'))
    }

    img.src = objectUrl
  })
}
