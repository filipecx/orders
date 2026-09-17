'use client'

import * as React from 'react'
import Image from 'next/image'
import type { ProductWithCategory } from '@/lib/domain/products'
import { formatCurrency, getProductPriceForModality } from '@/lib/domain/products'
import {
  Plus,
  Minus,
  Zap,
  Calendar,
  Clock,
  Lock,
  ShoppingBag,
} from 'lucide-react'

interface ProductCardProps {
  product: ProductWithCategory
  currentModality?: 'ready_delivery' | 'order'
  cartQuantity: number
  onAddToCart: () => void
  onRemoveFromCart: () => void
  onOpenModal?: () => void
  isLocked?: boolean
  onLockClick?: () => void
}

export function ProductCard({
  product,
  currentModality = 'ready_delivery',
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onOpenModal,
  isLocked = false,
  onLockClick,
}: ProductCardProps) {
  const price = getProductPriceForModality(product, currentModality)
  const isOrder = currentModality === 'order'
  const hasDiscount =
    !product.different_prices_by_mode &&
    product.promotional_price !== null &&
    product.promotional_price !== undefined &&
    product.promotional_price < product.price

  const handleCardClick = () => {
    if (onOpenModal) {
      onOpenModal()
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="group rounded-2xl overflow-hidden border border-neutral-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between w-full h-full cursor-pointer"
      style={{ backgroundColor: 'var(--store-card, #ffffff)' }}
    >
      {/* 1. Área da Imagem Panorâmica (Proporção 16:10 ideal para alimentos - não fica esticado nem alto demais) */}
      <div className="relative w-full aspect-[16/10] bg-neutral-100 overflow-hidden select-none">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center text-neutral-400 bg-neutral-100 gap-2 p-4">
            <ShoppingBag className="size-10 text-neutral-300 stroke-[1.5]" />
            <span className="text-xs text-neutral-400 font-medium">Foto em breve</span>
          </div>
        )}

        {/* Badges Flutuantes sobre a Foto (Canto Superior Esquerdo) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/95 text-neutral-900 backdrop-blur-md shadow-xs border border-neutral-200/80">
            {isOrder ? (
              <>
                <Calendar className="size-3.5 text-purple-700" />
                <span>Encomenda</span>
              </>
            ) : (
              <>
                <Zap className="size-3.5 text-neutral-900 fill-neutral-900" />
                <span>Pronta-entrega</span>
              </>
            )}
          </span>

          {/* Badge de Prazo de Antecedência para Encomendas */}
          {isOrder && (product.lead_time_days ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-900/90 text-white backdrop-blur-md shadow-xs">
              <Clock className="size-3" />
              <span>{product.lead_time_days}d antecedência</span>
            </span>
          )}
        </div>

        {/* Badge de Promoção (Canto Superior Direito) */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-xs">
              OFERTA
            </span>
          </div>
        )}
      </div>

      {/* 2. Corpo do Card (Espaçoso, com título e descrição bem legíveis) */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <h3
            className="font-bold text-lg sm:text-xl leading-snug transition-colors"
            style={{
              color: 'var(--store-text, #171717)',
              fontWeight: 'var(--store-font-weight-heading, 700)',
            }}
          >
            {product.name}
          </h3>

          {product.description && (
            <p
              className="text-sm sm:text-base opacity-75 line-clamp-3 leading-relaxed"
              style={{ color: 'var(--store-text, #171717)' }}
            >
              {product.description}
            </p>
          )}
        </div>

        {/* 3. Rodapé do Card (Preço na base com tipografia legível e Ação de Compra) */}
        <div
          className="flex justify-between items-center pt-4 border-t border-neutral-100/90 gap-3 mt-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preço em destaque */}
          <div className="flex flex-col">
            <span
              className="text-xl sm:text-2xl font-bold font-mono tabular-nums"
              style={{
                color: 'var(--store-text, #171717)',
                fontWeight: 'var(--store-font-weight-heading, 700)',
              }}
            >
              {formatCurrency(price)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through font-mono tabular-nums -mt-0.5">
                {formatCurrency(product.price)}
              </span>
            )}
          </div>

          {/* Botão de Compra / Controle de Quantidade */}
          <div>
            {isLocked ? (
              <button
                type="button"
                onClick={onLockClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium text-neutral-500 bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 transition-colors min-h-[42px] cursor-pointer"
                title="Pronta-entrega fora do horário de funcionamento"
              >
                <Lock className="size-3.5 text-neutral-400" />
                <span>Fechado</span>
              </button>
            ) : cartQuantity === 0 ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenModal) {
                    onOpenModal()
                  } else {
                    onAddToCart()
                  }
                }}
                style={{
                  backgroundColor: 'var(--primary, #000000)',
                  color: 'var(--store-primary-contrast, #ffffff)',
                  fontWeight: 'var(--store-font-weight-heading, 600)',
                }}
                className="hover:opacity-90 text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-lg inline-flex items-center gap-1.5 transition-opacity shadow-xs min-h-[42px] cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Adicionar</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-neutral-100 rounded-lg p-1 border border-neutral-200">
                <button
                  type="button"
                  onClick={onRemoveFromCart}
                  className="size-8 rounded-md bg-white hover:bg-neutral-50 text-neutral-900 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-7 text-center text-sm font-bold text-neutral-900 font-mono tabular-nums">
                  {cartQuantity}
                </span>
                <button
                  type="button"
                  onClick={onAddToCart}
                  className="size-8 rounded-md bg-white hover:bg-neutral-50 text-neutral-900 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
