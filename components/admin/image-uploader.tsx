'use client'

import * as React from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { uploadImage, type StorageBucket } from '@/lib/supabase/storage'
import { getCroppedImg, type PixelCrop } from '@/lib/utils/cropImage'
import {
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Crop as CropIcon,
  ZoomIn,
  ZoomOut,
  Pencil,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface ImageUploaderProps {
  value?: string | null
  onChange: (url: string) => void
  bucket?: StorageBucket
  pathPrefix?: string
  aspectRatio?: number | 'product' | 'square' | 'banner' | 'auto'
  suggestedDimensions?: string
  label?: string
  hint?: string
  disabled?: boolean
  className?: string
}

export function ImageUploader({
  value,
  onChange,
  bucket = 'products-media',
  pathPrefix,
  aspectRatio = 'product',
  suggestedDimensions,
  label,
  hint,
  disabled = false,
  className = '',
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [statusText, setStatusText] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Resolução base da proporção informada nas props
  const resolveInitialAspect = (): number => {
    if (typeof aspectRatio === 'number') {
      return aspectRatio
    }
    switch (aspectRatio) {
      case 'banner':
        return 3 / 1 // 1200x400 (Padrão iFood / Anota AI)
      case 'square':
        return 1 / 1
      case 'product':
      case 'auto':
      default:
        return 4 / 3 // Padrão recomendado para fotos de produtos
    }
  }

  // Estados do Modal de Corte (Cropper)
  const [isCropOpen, setIsCropOpen] = useState(false)
  const [activeAspect, setActiveAspect] = useState<number>(resolveInitialAspect)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>('imagem.webp')
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null)

  // Sincroniza activeAspect se a prop aspectRatio mudar
  useEffect(() => {
    setActiveAspect(resolveInitialAspect())
  }, [aspectRatio])

  const isBannerMode =
    aspectRatio === 'banner' ||
    (typeof aspectRatio === 'number' && aspectRatio >= 2.5)

  const handleSelectFile = (file: File) => {
    if (!file) return

    // Validação de tipo de arquivo
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).')
      return
    }

    setErrorMessage(null)
    setOriginalFileName(file.name)

    // Lê como DataURL para persistir a imagem original em memória para re-edição
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setOriginalImageSrc(dataUrl)
      setImageToCrop(dataUrl)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setActiveAspect(resolveInitialAspect())
      setCroppedAreaPixels(null)
      setIsCropOpen(true)
    }
    reader.onerror = () => {
      setErrorMessage('Erro ao carregar a imagem selecionada.')
    }
    reader.readAsDataURL(file)
  }

  const handleCloseCrop = () => {
    if (isUploading) return
    setIsCropOpen(false)
    setImageToCrop(null)
    setCroppedAreaPixels(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleReopenCrop = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || isUploading) return

    const source = originalImageSrc || value
    if (!source) return

    setImageToCrop(source)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setActiveAspect(resolveInitialAspect())
    setCroppedAreaPixels(null)
    setIsCropOpen(true)
  }

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return

    setIsUploading(true)
    setErrorMessage(null)

    try {
      // Para banners de alta resolução (1200x400 / 1920x640), permitimos até 1920px
      const maxDimension = isBannerMode ? 1920 : 1200

      setStatusText('Recortando imagem...')
      const croppedFile = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        originalFileName || 'imagem.webp',
        0.85,
        maxDimension
      )

      // Envio direto para o Supabase Storage
      setStatusText('Enviando para o servidor...')
      const publicUrl = await uploadImage(croppedFile, bucket, pathPrefix)

      // Notifica o formulário pai com a nova URL
      onChange(publicUrl)

      // Fecha o modal
      setIsCropOpen(false)
      setImageToCrop(null)
      setCroppedAreaPixels(null)
    } catch (err) {
      console.error('[ImageUploader] Erro no fluxo de crop e upload:', err)
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocorreu um erro ao processar e enviar a imagem.'
      )
    } finally {
      setIsUploading(false)
      setStatusText('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleSelectFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled || isUploading) return

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleSelectFile(file)
    }
  }

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || isUploading) return
    onChange('')
    setOriginalImageSrc(null)
    setErrorMessage(null)
  }

  const handleTriggerUpload = () => {
    if (disabled || isUploading) return
    fileInputRef.current?.click()
  }

  // Define proporção visual da área de preview no formulário
  const getContainerHeightClass = () => {
    if (isBannerMode) {
      return 'aspect-[3/1] w-full max-h-56'
    }
    if (aspectRatio === 'square' || (typeof aspectRatio === 'number' && aspectRatio === 1)) {
      return 'aspect-square max-w-[240px] w-full'
    }
    return 'aspect-[4/3] w-full max-h-60 sm:max-h-64'
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 block">
          {label}
        </span>
      )}

      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/avif"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Área Principal de Upload / Preview */}
      <div
        onClick={handleTriggerUpload}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative group overflow-hidden rounded-xl transition-all select-none ${getContainerHeightClass()} ${
          value && !isUploading
            ? 'border border-neutral-200/80 bg-neutral-100 shadow-xs'
            : isDragging
            ? 'border-2 border-dashed border-neutral-900 bg-neutral-100/90 ring-4 ring-neutral-900/5 cursor-pointer'
            : 'border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100/60 hover:border-neutral-400 cursor-pointer'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Caso 1: Durante o Upload / Processamento */}
        {isUploading && !isCropOpen ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-xs p-4 text-center z-10 space-y-2">
            <Loader2 className="size-6 text-neutral-800 animate-spin" />
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-neutral-900">
                {statusText || 'Processando imagem...'}
              </p>
              <p className="text-[11px] text-neutral-500">
                Otimizando em WebP {isBannerMode ? '(até 1920px)' : '(até 1200px)'}
              </p>
            </div>
          </div>
        ) : value ? (
          /* Caso 2: Imagem já enviada (Preview + Botões de Reajuste e Remoção) */
          <>
            <Image
              src={value}
              alt="Preview da imagem"
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover transition-transform duration-300 group-hover:scale-102"
              unoptimized
            />

            {/* Overlay sutil ao passar o mouse */}
            <div className="absolute inset-0 bg-neutral-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/80 text-white text-xs font-medium backdrop-blur-xs shadow-md">
                <RefreshCw className="size-3.5" />
                Trocar Imagem
              </span>
            </div>

            {/* Botões Flutuantes Superiores: [ ✏️ Reajustar Corte ] e [ 🗑️ Remover ] */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
              <button
                type="button"
                onClick={handleReopenCrop}
                disabled={disabled || isUploading}
                title="Reajustar enquadramento da foto"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/95 text-neutral-800 hover:text-neutral-950 hover:bg-white border border-neutral-200/80 shadow-xs text-xs font-medium backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Pencil className="size-3 text-neutral-600" />
                Reajustar Corte
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                title="Remover imagem"
                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white/95 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-neutral-200/80 shadow-xs text-xs font-medium backdrop-blur-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Trash2 className="size-3" />
                Remover
              </button>
            </div>
          </>
        ) : (
          /* Caso 3: Estado Inicial Vazio (Sem imagem) */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2">
            <div className="size-10 rounded-xl bg-white border border-neutral-200/80 shadow-2xs flex items-center justify-center text-neutral-600 group-hover:text-neutral-900 group-hover:scale-105 transition-all">
              <Upload className="size-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-neutral-800 group-hover:text-neutral-900">
                Clique ou arraste a imagem aqui
              </p>
              <p className="text-[11px] text-neutral-400">
                {isBannerMode
                  ? 'PNG, JPG ou WEBP (padrão panorâmico 3:1 ou 16:9)'
                  : 'PNG, JPG ou WEBP (enquadramento e zoom inclusos)'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dica de tamanho e proporção recomendada */}
      {(suggestedDimensions || hint) && !errorMessage && (
        <p className="text-xs text-neutral-600 font-medium leading-relaxed">
          {hint || (suggestedDimensions ? `💡 Tamanhos recomendados: ${suggestedDimensions}. Mantenha os elementos principais centralizados.` : '')}
        </p>
      )}

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-0.5">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modal / Dialog de Corte e Ajuste de Imagem */}
      <Dialog open={isCropOpen} onOpenChange={(open) => { if (!open) handleCloseCrop() }}>
        <DialogContent className="sm:max-w-xl p-5 gap-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-neutral-900">
              <CropIcon className="size-4 text-neutral-700" />
              {isBannerMode ? 'Ajustar Banner da Loja' : 'Ajustar e Enquadrar Foto'}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Arraste para centralizar e use o zoom para afastar ou aproximar livremente sem cortar artes prontas.
            </DialogDescription>
          </DialogHeader>

          {/* Seletores de Proporção Rápidos (iFood / Anota AI / Padrões de Mercado) */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
              Proporção:
            </span>
            <div className="flex items-center gap-1.5">
              {isBannerMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveAspect(3 / 1)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      Math.abs(activeAspect - 3) < 0.05
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    3:1 (iFood / Anota AI)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAspect(16 / 9)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      Math.abs(activeAspect - 16 / 9) < 0.05
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    16:9 (Panorâmico)
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveAspect(4 / 3)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      Math.abs(activeAspect - 4 / 3) < 0.05
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    4:3 (Padrão)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAspect(16 / 10)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      Math.abs(activeAspect - 16 / 10) < 0.05
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    16:10 (Vitrine)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAspect(1 / 1)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      Math.abs(activeAspect - 1) < 0.05
                        ? 'bg-neutral-900 text-white shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    1:1 (Quadrado)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Área do Cropper */}
          <div className="relative w-full h-64 sm:h-72 bg-neutral-950 rounded-xl overflow-hidden shadow-inner select-none">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                minZoom={0.3}
                maxZoom={3}
                restrictPosition={false}
                aspect={activeAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                showGrid={true}
              />
            )}
          </div>

          {/* Controle de Zoom com Slider permitindo Zoom Out (0.3x a 3x) */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-medium">
              <span className="flex items-center gap-1.5 text-neutral-700">
                <ZoomIn className="size-3.5" />
                Zoom / Afastamento
              </span>
              <span className="font-mono text-neutral-500 tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
                disabled={zoom <= 0.3 || isUploading}
                className="p-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Diminuir Zoom (Afastar)"
              >
                <ZoomOut className="size-4" />
              </button>
              <input
                type="range"
                min={0.3}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                disabled={isUploading}
                className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
              />
              <button
                type="button"
                onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
                disabled={zoom >= 3 || isUploading}
                className="p-1 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Aumentar Zoom (Aproximar)"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
          </div>

          {/* Rodapé com Botões de Ação */}
          <DialogFooter className="flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseCrop}
              disabled={isUploading}
              className="text-xs h-9 px-3.5"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmCrop}
              disabled={isUploading || !croppedAreaPixels}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium text-xs h-9 px-4 transition-all"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1.5" />
                  {statusText || 'Processando...'}
                </>
              ) : (
                'Confirmar Ajuste'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
