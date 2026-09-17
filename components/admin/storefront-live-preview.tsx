'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  type StoreTheme,
  APPROVED_GOOGLE_FONTS,
  getFontWeightStyles,
  getContrastTextColor,
} from '@/lib/domain/stores'
import {
  Smartphone,
  Monitor,
  Flame,
  Clock,
  MessageCircle,
  Zap,
  Calendar,
  Plus,
  Sparkles,
} from 'lucide-react'

interface StorefrontLivePreviewProps {
  storeName: string
  description?: string
  bannerUrl?: string | null
  logoUrl?: string | null
  whatsappNumber?: string | null
  theme: StoreTheme
}

export function StorefrontLivePreview({
  storeName,
  description,
  bannerUrl,
  logoUrl,
  whatsappNumber,
  theme,
}: StorefrontLivePreviewProps) {
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile')

  // Encontra a fonte selecionada no catálogo
  const selectedFont = useMemo(() => {
    return (
      APPROVED_GOOGLE_FONTS.find((f) => f.id === theme.font_family) ||
      APPROVED_GOOGLE_FONTS[0]
    )
  }, [theme.font_family])

  // Estilos de peso de fonte
  const fontWeights = useMemo(() => {
    return getFontWeightStyles(theme.font_weight)
  }, [theme.font_weight])

  // Cores de contraste automáticas para botões e badges
  const primaryContrastText = useMemo(() => {
    return getContrastTextColor(theme.primary_color)
  }, [theme.primary_color])

  const secondaryContrastText = useMemo(() => {
    return getContrastTextColor(theme.secondary_color)
  }, [theme.secondary_color])

  const displayName = storeName.trim() || 'Minha Loja'
  const displayBio =
    description?.trim() ||
    'Doces artesanais, bolos, sobremesas e delícias feitas com carinho para você.'

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Link da Google Fonts injetado dinamicamente para a prévia */}
      <link
        rel="stylesheet"
        href={`https://fonts.googleapis.com/css2?family=${selectedFont.googleFamily}&display=swap`}
      />

      {/* Barra de Ferramentas Superior da Prévia */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-600 font-medium">
          <Sparkles className="size-3.5 text-neutral-900" />
          <span>Prévia em Tempo Real</span>
        </div>

        {/* Alternador Mobile vs Desktop */}
        <div className="inline-flex items-center p-0.5 bg-neutral-100 rounded-lg border border-neutral-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setDeviceMode('mobile')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              deviceMode === 'mobile'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="Visualização Celular (Mobile 375px)"
          >
            <Smartphone className="size-3.5" />
            <span>Celular</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode('desktop')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              deviceMode === 'desktop'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
            title="Visualização Computador (Desktop Expandido)"
          >
            <Monitor className="size-3.5" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* Frame da Vitrine com Container Responsivo */}
      <div className="flex-1 min-h-[580px] bg-neutral-900/5 rounded-2xl p-3 sm:p-4 border border-neutral-200/80 flex items-center justify-center overflow-x-auto">
        <div
          className={`transition-all duration-300 w-full overflow-hidden rounded-2xl shadow-xl border border-neutral-200/90 flex flex-col ${
            deviceMode === 'mobile'
              ? 'max-w-[390px] min-h-[580px] ring-8 ring-neutral-900/10'
              : 'max-w-xl min-h-[580px]'
          }`}
          style={{
            backgroundColor: theme.background_color,
            fontFamily: selectedFont.cssFamily,
            color: theme.text_color,
          }}
        >
          {/* 1. Header & Capa / Banner */}
          <div className="relative w-full">
            {bannerUrl ? (
              <div className="relative w-full aspect-[3/1] bg-neutral-100 overflow-hidden">
                <Image
                  src={bannerUrl}
                  alt={displayName}
                  fill
                  sizes="450px"
                  className="object-cover object-center"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="relative w-full aspect-[3/1] flex flex-col items-center justify-center overflow-hidden transition-colors"
                style={{
                  backgroundColor: theme.primary_color,
                }}
              >
                <div className="absolute inset-0 bg-black/15" />
                <div className="relative flex flex-col items-center gap-1 text-white/90">
                  <Flame className="size-7 sm:size-8" />
                  <span className="text-[10px] font-medium tracking-wide uppercase opacity-80">
                    Banner de Capa (Placeholder)
                  </span>
                </div>
              </div>
            )}

            {/* Cabeçalho da Loja com Logo e Nome */}
            <div
              className="p-3.5 sm:p-4 space-y-3 border-b border-black/5"
              style={{ backgroundColor: theme.card_color }}
            >
              <div className="flex items-start gap-3">
                {logoUrl ? (
                  <div className="size-12 rounded-full border border-black/10 overflow-hidden relative shrink-0 bg-neutral-100 shadow-2xs">
                    <Image
                      src={logoUrl}
                      alt={displayName}
                      fill
                      sizes="48px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div
                    className="size-12 rounded-full flex items-center justify-center shrink-0 font-bold text-sm shadow-2xs"
                    style={{
                      backgroundColor: theme.primary_color,
                      color: primaryContrastText,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-0.5">
                  <h2
                    className="text-base sm:text-lg leading-tight truncate"
                    style={{
                      fontWeight: fontWeights.headingWeight,
                      color: theme.text_color,
                    }}
                  >
                    {displayName}
                  </h2>
                  <p
                    className="text-[11px] sm:text-xs line-clamp-2 opacity-75 leading-relaxed"
                    style={{
                      fontWeight: fontWeights.bodyWeight,
                      color: theme.text_color,
                    }}
                  >
                    {displayBio}
                  </p>
                </div>
              </div>

              {/* Status Aberto e Ação do WhatsApp */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
                  style={{
                    backgroundColor: `${theme.secondary_color}15`,
                    borderColor: `${theme.secondary_color}40`,
                    color: theme.text_color,
                  }}
                >
                  <span
                    className="size-2 rounded-full shrink-0 animate-pulse"
                    style={{ backgroundColor: theme.secondary_color }}
                  />
                  <span>Aberto agora</span>
                  <Clock className="size-3 opacity-60 ml-0.5" />
                </div>

                <div
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700"
                >
                  <MessageCircle className="size-3" />
                  <span>WhatsApp</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Seletor de Abas da Vitrine */}
          <div className="p-2.5 border-b border-black/5 bg-black/[0.02]">
            <div className="grid grid-cols-2 gap-1 p-1 bg-black/5 rounded-xl">
              <div
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold shadow-xs"
                style={{
                  backgroundColor: theme.primary_color,
                  color: primaryContrastText,
                  fontWeight: fontWeights.headingWeight,
                }}
              >
                <Zap className="size-3" />
                <span>Pronta-Entrega</span>
                <span
                  className="text-[9px] px-1 rounded-full font-mono"
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: primaryContrastText,
                  }}
                >
                  3
                </span>
              </div>

              <div
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs opacity-70"
                style={{
                  color: theme.text_color,
                  fontWeight: fontWeights.bodyWeight,
                }}
              >
                <Calendar className="size-3" />
                <span>Encomendas</span>
              </div>
            </div>
          </div>

          {/* Faixa de Aviso Minimalista */}
          <div
            className="px-3 py-1.5 text-[10px] text-center border-b border-black/5 opacity-80"
            style={{ fontWeight: fontWeights.bodyWeight }}
          >
            ⚡ <strong>Pronta-entrega:</strong> entregas imediatas hoje
          </div>

          {/* 3. Corpo da Vitrine: Card de Produto Demonstrativo (Placeholder) */}
          <div className="p-3 sm:p-4 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span
                className="text-xs tracking-wider uppercase opacity-60 font-semibold"
                style={{ fontWeight: fontWeights.headingWeight }}
              >
                Destaques da Casa
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${theme.secondary_color}20`,
                  color: theme.secondary_color,
                  fontWeight: 600,
                }}
              >
                Novidades
              </span>
            </div>

            {/* Card de Produto Customizado */}
            <div
              className="rounded-xl overflow-hidden border border-black/10 shadow-xs transition-all flex flex-col justify-between"
              style={{
                backgroundColor: theme.card_color,
              }}
            >
              {/* Imagem do Produto */}
              <div className="relative w-full aspect-[16/10] bg-neutral-200/80 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800&auto=format&fit=crop&q=80"
                  alt="Cookies Artesanais Recheados"
                  fill
                  sizes="400px"
                  className="object-cover"
                  unoptimized
                />

                {/* Badge Flutuante */}
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-md shadow-xs"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#171717',
                    }}
                  >
                    <Zap className="size-2.5 fill-current" />
                    <span>Pronta-entrega</span>
                  </span>
                </div>

                {/* Tag de Oferta */}
                <div className="absolute top-2.5 right-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold shadow-xs"
                    style={{
                      backgroundColor: theme.secondary_color,
                      color: secondaryContrastText,
                    }}
                  >
                    PROMOÇÃO
                  </span>
                </div>
              </div>

              {/* Informações do Produto */}
              <div className="p-3.5 space-y-2">
                <div className="space-y-1">
                  <h3
                    className="text-sm leading-snug"
                    style={{
                      fontWeight: fontWeights.headingWeight,
                      color: theme.text_color,
                    }}
                  >
                    Cookies Recheados Tradicionais
                  </h3>
                  <p
                    className="text-xs opacity-75 line-clamp-2 leading-relaxed"
                    style={{
                      fontWeight: fontWeights.bodyWeight,
                      color: theme.text_color,
                    }}
                  >
                    Massa crocante por fora e macia por dentro com recheio cremoso e gotas de chocolate nobre.
                  </p>
                </div>

                {/* Rodapé do Card: Preço e Botão Adicionar */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-2">
                  <div className="flex flex-col">
                    <span
                      className="text-base font-bold font-mono tabular-nums leading-none"
                      style={{
                        fontWeight: fontWeights.headingWeight,
                        color: theme.text_color,
                      }}
                    >
                      R$ 18,50
                    </span>
                    <span className="text-[10px] opacity-40 line-through font-mono">
                      R$ 22,00
                    </span>
                  </div>

                  <button
                    type="button"
                    className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                    style={{
                      backgroundColor: theme.primary_color,
                      color: primaryContrastText,
                      fontWeight: fontWeights.headingWeight,
                    }}
                  >
                    <Plus className="size-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
