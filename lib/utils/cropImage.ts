export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Cria uma instância de HTMLImageElement a partir de uma URL/DataURL/Object URL.
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

/**
 * Recorta e enquadra uma imagem com base nas coordenadas pixelCrop,
 * suportando zoom out (com preenchimento de fundo) e liberdade de posicionamento,
 * redimensiona para no máximo 800x800px e retorna um File em formato WebP comprimido.
 *
 * @param imageSrc URL da imagem (DataURL, object URL ou URL remota)
 * @param pixelCrop Coordenadas de corte em pixels { x, y, width, height }
 * @param fileName Nome base do arquivo de saída (opcional)
 * @param quality Qualidade do WebP (0 a 1, padrão 0.85)
 * @param maxDimension Dimensão máxima da imagem de saída em pixels (padrão 800)
 * @returns Promise com o arquivo File em formato image/webp
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName = 'cropped-image.webp',
  quality = 0.85,
  maxDimension = 800
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Não foi possível obter o contexto 2D do Canvas.')
  }

  const cropW = Math.max(1, pixelCrop.width)
  const cropH = Math.max(1, pixelCrop.height)
  const aspect = cropW / cropH

  // Calcula dimensões do canvas de saída respeitando maxDimension (800px)
  let targetWidth = Math.round(cropW)
  let targetHeight = Math.round(cropH)

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (aspect >= 1) {
      targetWidth = maxDimension
      targetHeight = Math.max(1, Math.round(maxDimension / aspect))
    } else {
      targetHeight = maxDimension
      targetWidth = Math.max(1, Math.round(maxDimension * aspect))
    }
  }

  canvas.width = targetWidth
  canvas.height = targetHeight

  // Fundo branco limpo para preencher eventuais áreas fora da imagem quando zoom < 1 ou restrictPosition={false}
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetWidth, targetHeight)

  // Configurações para suavização e alta qualidade gráfica
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Mapeamento proporcional seguro que suporta coordenadas negativas ou além dos limites
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height

  const scaleX = targetWidth / cropW
  const scaleY = targetHeight / cropH

  const dx = (0 - pixelCrop.x) * scaleX
  const dy = (0 - pixelCrop.y) * scaleY
  const dWidth = imageWidth * scaleX
  const dHeight = imageHeight * scaleY

  ctx.drawImage(image, dx, dy, dWidth, dHeight)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Falha ao gerar o arquivo de imagem recortada a partir do Canvas.'))
          return
        }

        // Sanitiza o nome do arquivo para garantir a extensão .webp
        const cleanBaseName = fileName.replace(/\.[^/.]+$/, '') || 'cropped-image'
        const webpFile = new File([blob], `${cleanBaseName}.webp`, {
          type: 'image/webp',
          lastModified: Date.now(),
        })

        resolve(webpFile)
      },
      'image/webp',
      quality
    )
  })
}
