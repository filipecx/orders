'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { OrderWithItems } from '@/lib/domain/orders'
import {
  type Store,
  getStorePickupAddress,
  formatStorePickupAddressFull,
  LOCATION_TYPE_LABELS,
} from '@/lib/domain/stores'
import {
  formatCurrency,
  formatWhatsAppOrderMessage,
  formatWhatsAppLink,
  type CheckoutAddress,
} from '@/lib/domain/orders'
import {
  CheckCircle2,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  Truck,
  Store as StoreIcon,
  ShoppingBag,
  ArrowLeft,
  ExternalLink,
  MapPin,
  AlertTriangle,
  XCircle,
} from 'lucide-react'

interface OrderConfirmationClientProps {
  order: OrderWithItems
  store: Store
}

export function OrderConfirmationClient({
  order,
  store,
}: OrderConfirmationClientProps) {
  const primaryColor = store.primary_color || '#000000'
  const [isCopied, setIsCopied] = useState(false)
  const pickupAddress = getStorePickupAddress(store)

  const address = order.delivery_address as CheckoutAddress | null
  const isDelivery = order.delivery_type === 'delivery'

  // Chave PIX do Lojista
  const pixKey = store.pix_key || 'Chave PIX a combinar'
  const pixKeyType = store.pix_key_type?.toUpperCase() || 'PIX'

  const handleCopyPix = async () => {
    if (!store.pix_key) return
    try {
      await navigator.clipboard.writeText(store.pix_key)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 3000)
    } catch {
      // Fallback manual se clipboard API falhar
    }
  }

  // Mensagem e link formatados para envio no WhatsApp
  const whatsAppMessage = formatWhatsAppOrderMessage(order, store)
  const whatsAppLink = formatWhatsAppLink(
    store.whatsapp_number,
    whatsAppMessage
  )

  const isCancelled = order.status === 'cancelled'

  return (
    <div
      className="min-h-screen bg-neutral-50 pb-16 text-neutral-900"
      style={{ '--primary': primaryColor } as React.CSSProperties}
    >
      <div className="max-w-md mx-auto min-h-screen bg-white border-x border-neutral-200/80 shadow-xs flex flex-col">
        {/* Header de Confirmação */}
        {isCancelled ? (
          <header className="p-6 bg-red-50/50 text-center space-y-3 border-b border-red-200/80">
            <div className="size-16 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto border border-red-200">
              <XCircle className="size-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-red-700">
                Pedido Cancelado
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mt-0.5">
                Pedido #{order.order_number}
              </h1>
              <p className="text-xs text-neutral-600 mt-1 max-w-sm mx-auto">
                Este pedido de pronta-entrega foi cancelado porque a loja encerrou o atendimento ou o horário de funcionamento foi atingido.
              </p>
            </div>
          </header>
        ) : (
          <header className="p-6 bg-neutral-50/70 text-center space-y-3 border-b border-neutral-200/80">
            <div className="size-16 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="size-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                {order.status === 'preparing' || order.production_status === 'preparing'
                  ? '✨ Pedido Confirmado & Em Preparo!'
                  : 'Pedido Registrado!'}
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 mt-0.5">
                Pedido #{order.order_number}
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                {order.status === 'preparing' || order.production_status === 'preparing' ? (
                  <>
                    Seu pedido foi <span className="font-semibold text-emerald-700">confirmado automaticamente</span> e já está na fila de preparo da loja <span className="font-semibold text-neutral-900">{store.name}</span>.
                  </>
                ) : (
                  <>
                    Obrigado pela sua compra na loja <span className="font-semibold text-neutral-900">{store.name}</span>.
                  </>
                )}
              </p>
            </div>
          </header>
        )}

        <div className="p-4 space-y-4 flex-1">
          {/* Card Principal: Ação de WhatsApp */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-5 space-y-3 text-center">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center justify-center gap-1.5">
                <MessageCircle className="size-4 text-emerald-700" />
                {isCancelled
                  ? 'Dúvidas sobre o cancelamento?'
                  : order.status === 'preparing' || order.production_status === 'preparing'
                  ? 'Acompanhe no WhatsApp'
                  : 'Envie seu pedido no WhatsApp'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isCancelled
                  ? 'Fale diretamente com a loja no WhatsApp caso queira tirar dúvidas ou checar previsão de novo atendimento.'
                  : order.status === 'preparing' || order.production_status === 'preparing'
                  ? 'Você pode abrir o WhatsApp da loja para tirar dúvidas ou acompanhar o envio em tempo real.'
                  : 'Clique no botão abaixo para enviar os detalhes do pedido diretamente para a loja confirmar.'}
              </p>
            </div>

            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <button
                type="button"
                className="w-full font-medium min-h-[44px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg h-12 text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageCircle className="size-5" />
                {isCancelled
                  ? 'Falar com a Loja no WhatsApp'
                  : order.status === 'preparing' || order.production_status === 'preparing'
                  ? 'Falar com a Loja no WhatsApp'
                  : 'Enviar Pedido no WhatsApp'}
                <ExternalLink className="size-4 opacity-70" />
              </button>
            </a>
          </div>

          {/* Card de Pagamento PIX */}
          {isCancelled ? (
            <div className="border border-red-200 rounded-xl bg-red-50/70 p-4 space-y-2">
              <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
                <AlertTriangle className="size-4 text-red-600 shrink-0" />
                Cobrança PIX Cancelada
              </div>
              <p className="text-xs text-red-700 leading-relaxed">
                A cobrança deste pedido foi cancelada porque a loja encerrou o atendimento para pronta-entrega. <strong>Por favor, não realize transferências para este pedido.</strong>
              </p>
            </div>
          ) : (
            <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <QrCode className="size-4 text-neutral-700" />
                  Pagamento via PIX
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-neutral-100 border border-neutral-200 text-neutral-700">
                  {pixKeyType}
                </span>
              </div>

              <div className="p-3.5 bg-neutral-50/60 rounded-xl border border-neutral-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-500">Valor a Transferir:</span>
                  <span className="text-base font-semibold font-mono tabular-nums text-neutral-900">
                    {formatCurrency(order.total)}
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-neutral-200/80">
                  <span className="text-[11px] text-neutral-500 block font-medium">
                    Chave PIX:
                  </span>
                  <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-neutral-200 text-xs font-mono break-all text-neutral-900">
                    <span>{pixKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="shrink-0 size-8 inline-flex items-center justify-center rounded-md hover:bg-neutral-100 text-neutral-600 transition-colors"
                      title="Copiar Chave"
                    >
                      {isCopied ? (
                        <Check className="size-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dados do Titular se disponíveis */}
                {(store.pix_merchant_name || store.pix_merchant_city) && (
                  <div className="text-[11px] text-neutral-500 flex justify-between pt-1">
                    {store.pix_merchant_name && (
                      <span>Titular: <strong>{store.pix_merchant_name}</strong></span>
                    )}
                    {store.pix_merchant_city && (
                      <span>Cidade: <strong>{store.pix_merchant_city}</strong></span>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCopyPix}
                className="w-full min-h-[44px] py-2.5 text-xs font-medium rounded-lg bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200 transition-colors inline-flex items-center justify-center gap-1.5"
              >
                {isCopied ? (
                  <>
                    <Check className="size-3.5 text-emerald-700" />
                    Chave PIX Copiada com Sucesso!
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" />
                    Copiar Chave PIX
                  </>
                )}
              </button>

              {/* Aviso de horário de atendimento solicitado pelo lojista */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Aviso:</strong> Só serão processados pedidos com pagamento realizado dentro do horário de funcionamento. Se sua cobrança foi cancelada, verifique o horário de atendimento.
                </p>
              </div>
            </div>
          )}

          {/* Resumo do Pedido e Itens */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 pb-2 border-b border-neutral-200/80">
              <ShoppingBag className="size-3.5 text-neutral-700" />
              Itens Comprados ({order.items.length})
            </div>
            <div className="divide-y divide-neutral-200/80 text-xs">
              {order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {item.quantity}x {item.product_name}
                    </p>
                    <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      Unitário: {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-semibold font-mono tabular-nums text-neutral-900">
                    {formatCurrency(item.total_price)}
                  </span>
                </div>
              ))}
            </div>

            {/* Detalhes de Entrega */}
            <div className="pt-2 border-t border-neutral-200/80 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-900">
                {isDelivery ? (
                  <>
                    <Truck className="size-3.5 text-neutral-700" />
                    Entrega no Endereço:
                  </>
                ) : (
                  <>
                    <StoreIcon className="size-3.5 text-neutral-700" />
                    Retirada no Local:
                  </>
                )}
              </div>

              {isDelivery && address ? (
                <p className="text-neutral-500 pl-5">
                  {address.street}, {address.number}
                  {address.complement ? ` (${address.complement})` : ''} — {address.neighborhood}, {address.city}
                  {address.reference ? ` [Ref: ${address.reference}]` : ''}
                </p>
              ) : (
                <div className="text-neutral-600 pl-5 space-y-1">
                  {pickupAddress && pickupAddress.street ? (
                    <>
                      <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-700 font-medium">
                          {LOCATION_TYPE_LABELS[pickupAddress.location_type || 'store']}
                        </span>
                      </p>
                      <p className="text-neutral-700 leading-relaxed font-medium">
                        {pickupAddress.street}, {pickupAddress.number}
                        {pickupAddress.complement ? ` - ${pickupAddress.complement}` : ''}
                        <br />
                        {pickupAddress.neighborhood} • {pickupAddress.city}/{pickupAddress.state}
                        {pickupAddress.zip_code ? ` • CEP ${pickupAddress.zip_code}` : ''}
                      </p>
                      {pickupAddress.reference && (
                        <p className="text-neutral-600 text-[11px]">
                          📍 <strong>Ref:</strong> {pickupAddress.reference}
                        </p>
                      )}
                      {pickupAddress.instructions && (
                        <p className="text-neutral-600 text-[11px]">
                          ℹ️ <strong>Instruções:</strong> {pickupAddress.instructions}
                        </p>
                      )}
                      <p className="text-neutral-500 text-[11px] pt-1">
                        Aguarde o aviso da loja no WhatsApp para retirar seu pedido.
                      </p>
                    </>
                  ) : (
                    <p className="text-neutral-500">
                      Aguarde o aviso da loja no WhatsApp para retirar seu pedido.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Totais */}
            <div className="pt-3 border-t border-neutral-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-500">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-neutral-900">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Entrega / Frete</span>
                <span className="text-neutral-700 font-medium">
                  {isDelivery ? 'A combinar via Uber Flash' : 'Retirada no Local'}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-neutral-900 pt-1 border-t border-neutral-200/80">
                <span>Total</span>
                <span className="font-mono tabular-nums text-neutral-900">{formatCurrency(order.total)}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link href={`/${store.slug}`} className="w-full">
                <Button variant="ghost" className="w-full text-xs text-neutral-600 hover:text-neutral-900">
                  <ArrowLeft className="size-3.5 mr-1.5" />
                  Voltar para a Página da Loja
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
