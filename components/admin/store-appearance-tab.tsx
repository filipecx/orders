'use client'

import * as React from 'react'
import {
  type StoreTheme,
  type FontId,
  type FontWeight,
  APPROVED_GOOGLE_FONTS,
  THEME_PRESETS,
  type ThemePreset,
} from '@/lib/domain/stores'
import { StorefrontLivePreview } from './storefront-live-preview'
import { ImageUploader } from './image-uploader'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Palette,
  Type,
  ImageIcon,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  HelpCircle,
} from 'lucide-react'

interface StoreAppearanceTabProps {
  storeName: string
  description?: string
  logoUrl?: string | null
  onLogoChange?: (url: string) => void
  bannerUrl: string
  onBannerChange: (url: string) => void
  whatsappNumber?: string | null
  theme: StoreTheme
  onThemeChange: (theme: StoreTheme) => void
  errors?: Record<string, string[]>
}

export function StoreAppearanceTab({
  storeName,
  description,
  logoUrl,
  onLogoChange,
  bannerUrl,
  onBannerChange,
  whatsappNumber,
  theme,
  onThemeChange,
  errors = {},
}: StoreAppearanceTabProps) {
  // Atualiza campo específico do tema
  const updateThemeField = <K extends keyof StoreTheme>(
    key: K,
    value: StoreTheme[K]
  ) => {
    onThemeChange({
      ...theme,
      [key]: value,
    })
  }

  // Aplica um preset pré-configurado
  const handleApplyPreset = (preset: ThemePreset) => {
    onThemeChange({
      ...preset.theme,
    })
  }

  // Normaliza string hex ao digitar
  const handleHexInput = (
    field: keyof StoreTheme,
    rawVal: string
  ) => {
    let val = rawVal.trim()
    if (!val.startsWith('#') && val.length > 0) {
      val = `#${val}`
    }
    updateThemeField(field, val as StoreTheme[typeof field])
  }

  return (
    <div className="space-y-6">
      {/* Importa os links de stylesheet para os previews dos botões de fonte */}
      {APPROVED_GOOGLE_FONTS.map((font) => (
        <link
          key={font.id}
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${font.googleFamily}&display=swap`}
        />
      ))}

      {/* Grid Principal: Controles à esquerda, Prévia Viva à direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA (Controles e Configurações) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Presets de Temas Prontos */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2.5 sm:pb-3 border-b border-neutral-200/80">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-sm">
                    Paletas Rápidas (1 Clique)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Escolha uma combinação harmônica ou personalize cada cor abaixo.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {THEME_PRESETS.map((preset) => {
                const isSelected =
                  theme.primary_color.toLowerCase() ===
                    preset.theme.primary_color.toLowerCase() &&
                  theme.background_color.toLowerCase() ===
                    preset.theme.background_color.toLowerCase() &&
                  theme.card_color.toLowerCase() ===
                    preset.theme.card_color.toLowerCase()

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    title={preset.name}
                    aria-label={`Paleta ${preset.name}`}
                    className={`relative flex flex-col items-center sm:items-start p-2.5 sm:p-3 rounded-xl border text-left transition-all cursor-pointer group ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900/5 ring-2 ring-neutral-900/10 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {/* VISÃO DESKTOP: Cabeçalho com Nome + Check */}
                    <div className="hidden sm:flex items-center justify-between w-full mb-2">
                      <span className="font-semibold text-xs text-neutral-900 group-hover:text-neutral-950">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <span className="size-4 rounded-full bg-neutral-900 text-white flex items-center justify-center shrink-0">
                          <Check className="size-2.5 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    {/* MINI CHECK NO MOBILE */}
                    {isSelected && (
                      <span className="sm:hidden absolute top-1 right-1 size-3.5 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-2xs">
                        <Check className="size-2 stroke-[3]" />
                      </span>
                    )}

                    {/* Mostrador visual das cores do preset (No Mobile: apenas as 4 bolinhas elegantes) */}
                    <div className="flex items-center justify-center sm:justify-start gap-1 sm:gap-1.5 py-1 sm:py-0 sm:mb-2 w-full">
                      <span
                        className="size-4 sm:size-4.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.previewPrimary }}
                        title={`Primária: ${preset.previewPrimary}`}
                      />
                      <span
                        className="size-4 sm:size-4.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.previewSecondary }}
                        title={`Secundária: ${preset.previewSecondary}`}
                      />
                      <span
                        className="size-4 sm:size-4.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.previewBg }}
                        title={`Fundo: ${preset.previewBg}`}
                      />
                      <span
                        className="size-4 sm:size-4.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                        style={{ backgroundColor: preset.previewCard }}
                        title={`Card: ${preset.previewCard}`}
                      />
                      <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-mono ml-auto">
                        {preset.theme.font_family}
                      </span>
                    </div>

                    {/* Descrição detalhada no Desktop */}
                    <p className="hidden sm:block text-[11px] text-neutral-500 line-clamp-1 leading-snug">
                      {preset.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Cores Principais */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200/80">
              <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900">
                <Palette className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Cores Principais da Vitrine
                </h3>
                <p className="text-xs text-neutral-500">
                  Ajuste os tons exatos de botões, fundo, cartões e tipografia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cor Primária */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="primary_color" className="text-xs font-semibold">
                    Cor Primária (Botões & Destaques) *
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary_color_picker"
                    value={
                      theme.primary_color.startsWith('#')
                        ? theme.primary_color
                        : '#000000'
                    }
                    onChange={(e) => updateThemeField('primary_color', e.target.value)}
                    className="size-9 rounded-lg border border-neutral-200 cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    id="primary_color"
                    value={theme.primary_color}
                    onChange={(e) => handleHexInput('primary_color', e.target.value)}
                    placeholder="#000000"
                    maxLength={7}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                {errors['theme.primary_color'] && (
                  <p className="text-[11px] text-destructive">
                    {errors['theme.primary_color'][0]}
                  </p>
                )}
              </div>

              {/* Cor Secundária */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="secondary_color" className="text-xs font-semibold">
                    Cor Secundária (Badges & Acentos) *
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary_color_picker"
                    value={
                      theme.secondary_color.startsWith('#')
                        ? theme.secondary_color
                        : '#4f46e5'
                    }
                    onChange={(e) => updateThemeField('secondary_color', e.target.value)}
                    className="size-9 rounded-lg border border-neutral-200 cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    id="secondary_color"
                    value={theme.secondary_color}
                    onChange={(e) => handleHexInput('secondary_color', e.target.value)}
                    placeholder="#4f46e5"
                    maxLength={7}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                {errors['theme.secondary_color'] && (
                  <p className="text-[11px] text-destructive">
                    {errors['theme.secondary_color'][0]}
                  </p>
                )}
              </div>

              {/* Cor de Fundo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="background_color" className="text-xs font-semibold">
                    Cor de Fundo da Vitrine *
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="background_color_picker"
                    value={
                      theme.background_color.startsWith('#')
                        ? theme.background_color
                        : '#f9fafb'
                    }
                    onChange={(e) => updateThemeField('background_color', e.target.value)}
                    className="size-9 rounded-lg border border-neutral-200 cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    id="background_color"
                    value={theme.background_color}
                    onChange={(e) => handleHexInput('background_color', e.target.value)}
                    placeholder="#f9fafb"
                    maxLength={7}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                {errors['theme.background_color'] && (
                  <p className="text-[11px] text-destructive">
                    {errors['theme.background_color'][0]}
                  </p>
                )}
              </div>

              {/* Cor do Card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="card_color" className="text-xs font-semibold">
                    Cor do Card (Produtos & Blocos) *
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="card_color_picker"
                    value={
                      theme.card_color.startsWith('#')
                        ? theme.card_color
                        : '#ffffff'
                    }
                    onChange={(e) => updateThemeField('card_color', e.target.value)}
                    className="size-9 rounded-lg border border-neutral-200 cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    id="card_color"
                    value={theme.card_color}
                    onChange={(e) => handleHexInput('card_color', e.target.value)}
                    placeholder="#ffffff"
                    maxLength={7}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                {errors['theme.card_color'] && (
                  <p className="text-[11px] text-destructive">
                    {errors['theme.card_color'][0]}
                  </p>
                )}
              </div>

              {/* Cor dos Textos */}
              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="text_color" className="text-xs font-semibold">
                    Cor dos Textos & Títulos *
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="text_color_picker"
                    value={
                      theme.text_color.startsWith('#')
                        ? theme.text_color
                        : '#171717'
                    }
                    onChange={(e) => updateThemeField('text_color', e.target.value)}
                    className="size-9 rounded-lg border border-neutral-200 cursor-pointer bg-transparent p-0.5 shrink-0"
                  />
                  <Input
                    id="text_color"
                    value={theme.text_color}
                    onChange={(e) => handleHexInput('text_color', e.target.value)}
                    placeholder="#171717"
                    maxLength={7}
                    className="font-mono text-xs uppercase"
                  />
                </div>
                {errors['theme.text_color'] && (
                  <p className="text-[11px] text-destructive">
                    {errors['theme.text_color'][0]}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Branding: Banner de Capa & Logotipo */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200/80">
              <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900">
                <ImageIcon className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Branding: Banner de Capa & Logotipo
                </h3>
                <p className="text-xs text-neutral-500">
                  Imagens que representam visualmente a sua marca no topo da vitrine.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <ImageUploader
                label="Imagem do Banner (Capa do Topo)"
                value={bannerUrl}
                onChange={onBannerChange}
                bucket="stores-media"
                pathPrefix="banners"
                aspectRatio={3 / 1}
                suggestedDimensions="1200 x 400 px (3:1) ou 1920 x 640 px"
                hint="Dica: fotos panorâmicas bem iluminadas deixam a vitrine muito mais atraente e profissional."
              />
              {errors.banner_url && (
                <p className="text-xs text-destructive">{errors.banner_url[0]}</p>
              )}
            </div>

            {onLogoChange && (
              <div className="space-y-2 pt-3 border-t border-neutral-100">
                <ImageUploader
                  label="Logotipo da Marca (Avatar)"
                  value={logoUrl ?? ''}
                  onChange={onLogoChange}
                  bucket="stores-media"
                  pathPrefix="logos"
                  aspectRatio={1}
                  suggestedDimensions="400 x 400 px (1:1)"
                  hint="Dica: imagem quadrada com fundo transparente ou sólido com sua marca centralizada."
                />
                {errors.logo_url && (
                  <p className="text-xs text-destructive">{errors.logo_url[0]}</p>
                )}
              </div>
            )}
          </div>

          {/* 4. Tipografia & Google Fonts */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-5 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-neutral-200/80">
              <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-900">
                <Type className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Tipografia da Vitrine (Google Fonts)
                </h3>
                <p className="text-xs text-neutral-500">
                  Escolha uma fonte do catálogo pré-aprovado e o peso de leitura.
                </p>
              </div>
            </div>

            {/* Seletor de Peso da Fonte */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Peso / Estilo da Fonte (Bold, Regular ou Light)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {
                      id: 'light',
                      label: 'Leve',
                      sub: 'Light (300)',
                      weightClass: 'font-light',
                    },
                    {
                      id: 'regular',
                      label: 'Padrão',
                      sub: 'Regular (400)',
                      weightClass: 'font-normal',
                    },
                    {
                      id: 'bold',
                      label: 'Marcante',
                      sub: 'Bold (700)',
                      weightClass: 'font-bold',
                    },
                  ] as const
                ).map((opt) => {
                  const isSelected = theme.font_weight === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateThemeField('font_weight', opt.id)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-800'
                      }`}
                    >
                      <span className={`text-sm ${opt.weightClass}`}>
                        {opt.label}
                      </span>
                      <span
                        className={`text-[10px] mt-0.5 ${
                          isSelected ? 'text-neutral-300' : 'text-neutral-400'
                        }`}
                      >
                        {opt.sub}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Catálogo de Fontes Pré-aprovadas */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">
                Catálogo de Fontes Pré-aprovadas
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {APPROVED_GOOGLE_FONTS.map((font) => {
                  const isSelected = theme.font_family === font.id
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateThemeField('font_family', font.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer group flex flex-col justify-between ${
                        isSelected
                          ? 'border-neutral-900 bg-neutral-900/5 ring-2 ring-neutral-900/10 shadow-xs'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className="text-base text-neutral-900 leading-tight"
                          style={{ fontFamily: font.cssFamily }}
                        >
                          {font.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-neutral-100 text-neutral-600 font-medium uppercase tracking-wider">
                          {font.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-1 leading-snug">
                        {font.description}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA (Prévia Fixa / Sticky da Vitrine) */}
        <div className="lg:col-span-5 lg:sticky lg:top-6">
          <div className="border border-neutral-200/80 rounded-2xl shadow-xs bg-white p-4">
            <StorefrontLivePreview
              storeName={storeName}
              description={description}
              bannerUrl={bannerUrl}
              logoUrl={logoUrl}
              whatsappNumber={whatsappNumber}
              theme={theme}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
