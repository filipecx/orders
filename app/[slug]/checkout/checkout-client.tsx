"use client";

import * as React from "react";
import { useState, useEffect, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  type Store,
  getStorePickupAddress,
  formatStorePickupAddressFull,
  LOCATION_TYPE_LABELS,
} from "@/lib/domain/stores";
import {
  formatCurrency,
  type DeliveryType,
  type PaymentMethod,
} from "@/lib/domain/orders";
import type { CartItem } from "../storefront-client";
import { createOrderAction } from "./actions";
import {
  ArrowLeft,
  ShoppingBag,
  Truck,
  Store as StoreIcon,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Calendar,
  Clock,
  MapPin,
} from "lucide-react";
import { Drop } from "@/lib/domain/drops";

interface CheckoutClientProps {
  store: Store;
  drop?: string;
}

export function CheckoutClient({ store, drop }: CheckoutClientProps) {
  const router = useRouter();
  const primaryColor = store.primary_color || "#000000";
  const pickupAddress = useMemo(() => getStorePickupAddress(store), [store]);

  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Dados do Comprador
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery");

  // Endereço de Entrega
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [complement, setComplement] = useState("");
  const [reference, setReference] = useState("");

  // Pagamento e Notas
  const [paymentMethod] = useState<PaymentMethod>("pix");
  const [notes, setNotes] = useState("");

  // Idempotência: chave única gerada para esta submissão de checkout
  const [idempotencyKey] = useState(() => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  });

  // Feedback
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carregar dados do sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`cart_${store.id}`);
      if (saved) {
        const parsedCart = JSON.parse(saved);
        startTransition(() => {
          setCart(parsedCart);
        });
      }
    } catch {
      // Ignora
    } finally {
      setIsLoaded(true);
    }
  }, [store.id]);

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.unitPrice * item.quantity,
    0,
  );

  const total = subtotal;

  // Agendamento de Produção & Data
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState("");

  // Verifica se há itens sob encomenda no carrinho
  const hasOrderItems = cartItems.some((item) => item.saleType === "order");
  const maxLeadTime = Math.max(
    ...cartItems.map((item) => item.leadTimeDays || 0),
    0
  );

  // Calcula a data mínima permitida para entrega/retirada
  const minDateString = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + (hasOrderItems ? maxLeadTime : 0));
    return d.toISOString().split("T")[0];
  }, [hasOrderItems, maxLeadTime]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});
    setErrorMessage(null);

    if (cartItems.length === 0) {
      setErrorMessage("Seu carrinho está vazio.");
      return;
    }

    if (hasOrderItems && !scheduledDate) {
      setErrorMessage("Por favor, selecione a data desejada para seu pedido sob encomenda.");
      return;
    }

    const payload = {
      store_id: store.id,
      drop_id: drop || cartItems[0]?.dropItemId || null,
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      delivery_type: deliveryType,
      delivery_method: (deliveryType === "pickup" ? "pickup" : "delivery") as "delivery" | "pickup",
      delivery_address:
        deliveryType === "delivery"
          ? {
              street,
              number,
              neighborhood,
              city,
              complement: complement || undefined,
              reference: reference || undefined,
            }
          : null,
      scheduled_date: scheduledDate || null,
      scheduled_time_slot: scheduledTimeSlot || null,
      payment_method: paymentMethod,
      notes: notes || null,
      idempotency_key: idempotencyKey,
      items: cartItems.map((item) => ({
        product_id: item.productId ?? null,
        combo_id: item.comboId ?? null,
        drop_item_id: item.dropItemId ?? null,
        product_name: item.productName,
        product_image_url: item.productImageUrl ?? null,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        customizations: item.customizations
          ? {
              combo_id: item.customizations.combo_id,
              combo_name: item.customizations.combo_name,
              choices: item.customizations.choices,
            }
          : null,
      })),
    };

    startTransition(async () => {
      const res = await createOrderAction(payload);

      if (res.success && res.orderId) {
        // Limpar carrinho
        sessionStorage.removeItem(`cart_${store.id}`);
        router.push(`/${store.slug}/order/${res.orderId}`);
      } else {
        setErrorMessage(res.message);
        if (res.errors) {
          setErrors(res.errors);
        }
      }
    });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-muted/15 flex items-center justify-center p-8">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div
        className="min-h-screen bg-muted/15 p-4 flex flex-col justify-center items-center text-center"
        style={{ "--primary": primaryColor } as React.CSSProperties}
      >
        <div className="max-w-md w-full bg-background rounded-2xl p-8 border border-border/80 shadow-xl space-y-4">
          <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <ShoppingBag className="size-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            Seu carrinho está vazio
          </h2>
          <p className="text-xs text-muted-foreground">
            Volte para a vitrine para selecionar os produtos desejados.
          </p>
          <Link href={`/${store.slug}`}>
            <Button className="w-full">Voltar para a Loja</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-neutral-50 pb-16 text-neutral-900"
      style={{ "--primary": primaryColor } as React.CSSProperties}
    >
      <div className="max-w-md mx-auto min-h-screen bg-white border-x border-neutral-200/80 shadow-xs flex flex-col">
        {/* Header com Navegação */}
        <header className="p-4 border-b border-neutral-200/80 flex items-center gap-3 bg-white sticky top-0 z-30">
          <Link
            href={`/${store.slug}`}
            className="size-9 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700 hover:bg-neutral-200 transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="flex items-center gap-2.5 min-w-0">
            {store.logo_url ? (
              <div className="size-9 rounded-full overflow-hidden relative shrink-0 border border-neutral-200/80 shadow-2xs">
                <Image
                  src={store.logo_url}
                  alt={store.name}
                  fill
                  sizes="36px"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div
                className="size-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs select-none"
                style={{
                  backgroundColor: primaryColor,
                  color: '#ffffff',
                }}
              >
                {store.name ? store.name.trim().charAt(0).toUpperCase() : 'L'}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-neutral-900 leading-tight truncate">Finalizar Pedido</h1>
              <p className="text-[11px] text-neutral-500 truncate">{store.name}</p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="p-4 space-y-5 flex-1">
          {/* Mensagem de Erro Geral */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
              <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-700" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resumo do Pedido / Itens */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5 pb-2 border-b border-neutral-200/80">
              <ShoppingBag className="size-3.5 text-neutral-700" />
              Resumo dos Itens ({cartItems.length})
            </div>
            <div className="divide-y divide-neutral-200/80">
              {cartItems.map((item) => (
                <div
                  key={item.id || item.productId || item.productName}
                  className="py-2.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-10 rounded-lg bg-neutral-100 overflow-hidden shrink-0 relative border border-neutral-200">
                        {item.productImageUrl ? (
                          <Image
                            src={item.productImageUrl}
                            alt={item.productName}
                            fill
                            sizes="40px"
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <ShoppingBag className="size-4 m-auto text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {item.type === "combo" && (
                            <span className="text-[10px] bg-neutral-100 text-neutral-800 font-medium px-1.5 py-0.2 rounded border border-neutral-200">
                              Combo
                            </span>
                          )}
                          <p className="font-semibold text-neutral-900 line-clamp-1">
                            {item.productName}
                          </p>
                        </div>
                        <p className="text-[11px] text-neutral-500 font-mono tabular-nums">
                          {item.quantity}x {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                    </div>

                    <span className="font-semibold font-mono tabular-nums text-neutral-900">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </span>
                  </div>

                  {/* Sabores escolhidos se for combo */}
                  {item.customizations?.choices && item.customizations.choices.length > 0 && (
                    <div className="ml-12 p-2 rounded-lg bg-neutral-50/60 border border-neutral-200/80 text-[11px] space-y-0.5">
                      <span className="text-[10px] uppercase font-medium text-neutral-500 block">
                        Sabores Escolhidos:
                      </span>
                      {item.customizations.choices.map((c, i) => (
                        <div key={i} className="flex justify-between text-neutral-800">
                          <span>{c.name}</span>
                          <span className="font-semibold font-mono tabular-nums text-neutral-900">{c.quantity}x</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Agendamento de Produção & Data (se houver itens sob encomenda) */}
          {hasOrderItems && (
            <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 pb-2 border-b border-neutral-200/80">
                <Calendar className="size-3.5" />
                Agendamento de Entrega & Produção
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledDate">Data Desejada para Entrega / Retirada *</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    min={minDateString}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    required={hasOrderItems}
                    className="bg-white border-neutral-200"
                  />
                  {maxLeadTime > 0 && (
                    <p className="text-[11px] text-neutral-500 flex items-center gap-1">
                      <Clock className="size-3 text-neutral-700" />
                      Seu pedido contém itens que exigem pelo menos {maxLeadTime} dia(s) de antecedência de produção.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="scheduledTimeSlot">Faixa de Horário Preferencial (Opcional)</Label>
                  <select
                    id="scheduledTimeSlot"
                    value={scheduledTimeSlot}
                    onChange={(e) => setScheduledTimeSlot(e.target.value)}
                    className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer"
                  >
                    <option value="">Qualquer horário comercial</option>
                    <option value="09:00 - 12:00">Manhã (09:00 - 12:00)</option>
                    <option value="13:00 - 16:00">Tarde (13:00 - 16:00)</option>
                    <option value="16:00 - 19:00">Fim de Tarde (16:00 - 19:00)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Dados Pessoais do Comprador */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pb-2 border-b border-neutral-200/80">
              1. Seus Dados de Contato
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Seu Nome Completo *</Label>
                <Input
                  id="customerName"
                  placeholder="Ex: Maria Oliveira"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  aria-invalid={!!errors.customer_name}
                  className="bg-white border-neutral-200"
                />
                {errors.customer_name && (
                  <p className="text-xs text-destructive">
                    {errors.customer_name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">WhatsApp com DDD *</Label>
                <Input
                  id="customerPhone"
                  placeholder="Ex: (11) 99999-8888"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  aria-invalid={!!errors.customer_phone}
                  className="bg-white border-neutral-200"
                />
                {errors.customer_phone && (
                  <p className="text-xs text-destructive">
                    {errors.customer_phone[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customerEmail">E-mail (opcional)</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  placeholder="Para receber o comprovante"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="bg-white border-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Opções de Entrega */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pb-2 border-b border-neutral-200/80">
              2. Método de Entrega
            </div>
            <div className="space-y-3">
              {/* Toggle Entrega / Retirada com toque >= 44px */}
              <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  style={
                    deliveryType === "delivery"
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                  className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-all ${
                    deliveryType === "delivery"
                      ? "text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <Truck className="size-3.5" />
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  style={
                    deliveryType === "pickup"
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                  className={`flex items-center justify-center gap-1.5 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-all ${
                    deliveryType === "pickup"
                      ? "text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  <StoreIcon className="size-3.5" />
                  Retirada no Local
                </button>
              </div>

              {/* Formulário de Endereço se Delivery */}
              {deliveryType === "delivery" ? (
                <div className="space-y-3 pt-2">
                  {/* Aviso de Frete Uber Flash */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                    <Truck className="size-4 shrink-0 mt-0.5 text-amber-700" />
                    <div>
                      <strong className="block font-semibold">Frete não incluso no valor</strong>
                      <span>O valor da entrega será cotado e combinado via Uber Flash diretamente pelo WhatsApp após a compra.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="street">Rua / Logradouro *</Label>
                      <Input
                        id="street"
                        placeholder="Ex: Av. Paulista"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        required
                        className="bg-white border-neutral-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="number">Número *</Label>
                      <Input
                        id="number"
                        placeholder="1000"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        required
                        className="bg-white border-neutral-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="neighborhood">Bairro *</Label>
                      <Input
                        id="neighborhood"
                        placeholder="Ex: Bela Vista"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        required
                        className="bg-white border-neutral-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="city">Cidade *</Label>
                      <Input
                        id="city"
                        placeholder="Ex: São Paulo"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="bg-white border-neutral-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        placeholder="Apto, Bloco..."
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        className="bg-white border-neutral-200"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="reference">Ponto de Referência</Label>
                      <Input
                        id="reference"
                        placeholder="Próximo ao mercado..."
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        className="bg-white border-neutral-200"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {pickupAddress && pickupAddress.street ? (
                    <div className="p-3.5 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs text-neutral-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900 flex items-center gap-1.5">
                          <MapPin className="size-3.5 text-neutral-700" />
                          Local para Retirada:
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-neutral-200 text-neutral-700 font-medium">
                          {LOCATION_TYPE_LABELS[pickupAddress.location_type || "store"]}
                        </span>
                      </div>
                      <p className="text-neutral-700 leading-relaxed font-medium">
                        {pickupAddress.street}, {pickupAddress.number}
                        {pickupAddress.complement ? ` - ${pickupAddress.complement}` : ""}
                        <br />
                        {pickupAddress.neighborhood} • {pickupAddress.city}/{pickupAddress.state}
                        {pickupAddress.zip_code ? ` • CEP ${pickupAddress.zip_code}` : ""}
                      </p>
                      {pickupAddress.reference && (
                        <p className="text-neutral-600 text-[11px] pt-1 border-t border-neutral-200/60">
                          📍 <strong>Ref:</strong> {pickupAddress.reference}
                        </p>
                      )}
                      {pickupAddress.instructions && (
                        <p className="text-neutral-600 text-[11px]">
                          ℹ️ <strong>Instruções:</strong> {pickupAddress.instructions}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-neutral-50 rounded-xl text-xs text-neutral-600 border border-neutral-200/80">
                      Você poderá retirar seu pedido diretamente no local da loja após a confirmação no WhatsApp.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="border border-neutral-200/80 rounded-xl bg-white shadow-xs p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 pb-2 border-b border-neutral-200/80">
              3. Forma de Pagamento
            </div>
            <div>
              <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50/60 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-neutral-200 text-neutral-800">
                    <QrCode className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900">
                      PIX (Instantâneo)
                    </p>
                    <p className="text-[11px] text-neutral-500">
                      Chave PIX e QR Code gerados na próxima tela.
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="size-5 text-neutral-900" />
              </div>
            </div>

            {/* Aviso de pagamento em horário de funcionamento */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Aviso:</strong> Só serão processados pedidos com pagamento realizado dentro do horário de funcionamento. Se sua cobrança for cancelada, verifique o horário de atendimento.
              </p>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações do Pedido (opcional)</Label>
            <Input
              id="notes"
              placeholder="Alguma instrução especial para entrega ou pedido?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white border-neutral-200"
            />
          </div>

          {/* Totalizador e Botão de Finalização */}
          <div className="p-4 bg-neutral-50/70 rounded-xl border border-neutral-200/80 space-y-2">
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Subtotal dos itens</span>
              <span className="font-mono tabular-nums text-neutral-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>Entrega / Frete</span>
              <span className="text-neutral-700 font-medium">
                {deliveryType === "delivery" ? "A combinar via Uber Flash" : "Retirada no Local"}
              </span>
            </div>
            <div className="border-t border-neutral-200/80 pt-2 flex justify-between text-base font-semibold text-neutral-900">
              <span>Total a Pagar (PIX)</span>
              <span className="font-mono tabular-nums text-neutral-900">{formatCurrency(total)}</span>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            style={{ backgroundColor: primaryColor }}
            className="w-full font-medium min-h-[44px] h-12 text-sm hover:opacity-90 text-white rounded-lg shadow-xs"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Processando seu pedido...
              </>
            ) : (
              <>
                <Lock className="size-4 mr-2" />
                Confirmar Pedido • {formatCurrency(total)}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
