import { z } from 'zod'
import type { Database } from '@/types/database.types'
import {
  type Store,
  type StorePickupAddress,
  type WhatsAppTemplates,
  DEFAULT_WHATSAPP_TEMPLATES,
  getStorePickupAddress,
  formatStorePickupAddressFull,
} from './stores'

export const deliveryTypeEnum = z.enum(['delivery', 'pickup', 'dine_in'])
export type DeliveryType = z.infer<typeof deliveryTypeEnum>

export const deliveryMethodEnum = z.enum(['delivery', 'pickup'])
export type DeliveryMethod = z.infer<typeof deliveryMethodEnum>

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  delivery: 'Entrega (Delivery)',
  pickup: 'Retirada no Local',
}

export const productionStatusEnum = z.enum([
  'pending',
  'preparing',
  'ready',
  'delivered',
])
export type ProductionStatus = z.infer<typeof productionStatusEnum>

export const PRODUCTION_STATUS_LABELS: Record<ProductionStatus, string> = {
  pending: 'Pendente',
  preparing: 'Em Preparo',
  ready: 'Pronto',
  delivered: 'Entregue',
}

export const PRODUCTION_STATUS_BADGE_VARIANTS: Record<
  ProductionStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  preparing: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  ready: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  delivered: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
}

export const paymentMethodEnum = z.enum([
  'pix',
  'credit_card',
  'debit_card',
  'cash',
  'on_delivery',
  'whatsapp',
])
export type PaymentMethod = z.infer<typeof paymentMethodEnum>

export const checkoutAddressSchema = z.object({
  street: z.string().min(2, 'Informe a rua / logradouro.'),
  number: z.string().min(1, 'Informe o número.'),
  neighborhood: z.string().min(2, 'Informe o bairro.'),
  city: z.string().min(2, 'Informe a cidade.'),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  complement: z.string().optional(),
  reference: z.string().optional(),
})

export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>

export const checkoutItemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  combo_id: z.string().uuid().nullable().optional(),
  drop_item_id: z.string().uuid().nullable().optional(),
  product_name: z.string().min(1),
  product_image_url: z.string().nullable().optional(),
  unit_price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1, 'Quantidade mínima é 1.'),
  notes: z.string().nullable().optional(),
  customizations: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type CheckoutItem = z.infer<typeof checkoutItemSchema>

export const checkoutFormSchema = z.object({
  store_id: z.string().uuid(),
  drop_id: z.string().uuid().nullable().optional(),
  customer_name: z
    .string()
    .min(2, 'Informe seu nome completo.')
    .max(255),
  customer_phone: z
    .string()
    .min(10, 'Informe seu WhatsApp com DDD.')
    .max(30),
  customer_email: z.string().email('E-mail inválido.').nullable().optional().or(z.literal('')),
  delivery_type: deliveryTypeEnum.default('delivery'),
  delivery_method: deliveryMethodEnum.default('delivery').optional(),
  delivery_address: checkoutAddressSchema.nullable().optional(),
  scheduled_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD.')
    .nullable()
    .optional(),
  scheduled_time_slot: z.string().max(100).nullable().optional(),
  production_status: productionStatusEnum.default('pending').optional(),
  payment_method: paymentMethodEnum.default('pix'),
  notes: z.string().max(500).nullable().optional(),
  idempotency_key: z.string().uuid().nullable().optional(),
  items: z.array(checkoutItemSchema).min(1, 'Seu carrinho está vazio.'),
})

export type CheckoutFormInput = z.infer<typeof checkoutFormSchema>

export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']

export type OrderWithItems = Order & {
  items: OrderItem[]
  store?: Store | null
}

export const orderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled',
])
export type OrderStatus = z.infer<typeof orderStatusEnum>

export const paymentStatusEnum = z.enum([
  'pending',
  'paid',
  'failed',
  'refunded',
])
export type PaymentStatus = z.infer<typeof paymentStatusEnum>

export const updateOrderStatusSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido.'),
  status: orderStatusEnum,
  payment_status: paymentStatusEnum.optional(),
  production_status: productionStatusEnum.optional(),
})
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>

export const updateProductionStatusSchema = z.object({
  order_id: z.string().uuid('ID do pedido inválido.'),
  production_status: productionStatusEnum,
})
export type UpdateProductionStatusInput = z.infer<typeof updateProductionStatusSchema>

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Pago / Confirmado',
  preparing: 'Em preparo',
  ready_for_pickup: 'Pronto para retirada',
  out_for_delivery: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

export const ORDER_STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  { bg: string; text: string; border: string }
> = {
  pending: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  confirmed: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  preparing: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  ready_for_pickup: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  out_for_delivery: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200',
  },
  delivered: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
  cancelled: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
}

export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = {
  delivery: 'Entrega (Delivery)',
  pickup: 'Retirada no Local',
  dine_in: 'Consumo no Local',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  on_delivery: 'Pagamento na Entrega',
  whatsapp: 'A Combinar via WhatsApp',
}

// Funções puras de regras de negócio
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/**
 * Formata o agendamento de data e horário para exibição amigável.
 */
export function formatProductionSchedule(
  scheduledDate?: string | null,
  scheduledTimeSlot?: string | null
): string | null {
  if (!scheduledDate) return null
  const [year, month, day] = scheduledDate.split('-')
  const dateFormatted = `${day}/${month}/${year}`
  return scheduledTimeSlot ? `${dateFormatted} (${scheduledTimeSlot})` : dateFormatted
}

/**
 * Gera mensagem formatada para envio direto no WhatsApp da loja.
 */
export function formatWhatsAppOrderMessage(
  order: OrderWithItems,
  store: Store
): string {
  const address = order.delivery_address as CheckoutAddress | null
  const isDelivery = (order.delivery_method || order.delivery_type) === 'delivery'

  let itemsText = ''
  order.items.forEach((item, index) => {
    const itemTotal = formatCurrency(item.total_price)
    itemsText += `${index + 1}. *${item.quantity}x* ${item.product_name} (${itemTotal})\n`

    if (item.customizations && typeof item.customizations === 'object') {
      const cust = item.customizations as Record<string, unknown>
      if (Array.isArray(cust.choices) && cust.choices.length > 0) {
        const choicesSummary = cust.choices
          .map((c: { name: string; quantity: number }) => `${c.quantity}x ${c.name}`)
          .join(', ')
        itemsText += `   └ *Sabores:* ${choicesSummary}\n`
      }
    }
  })

  let addressText = ''
  if (isDelivery && address) {
    addressText = `\n📍 *Endereço de Entrega:*\n${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}\nBairro: ${address.neighborhood}\nCidade: ${address.city}${address.reference ? `\nRef: ${address.reference}` : ''}\n🛵 *Frete:* A combinar via Uber Flash após a compra`
  } else {
    const pickupAddr = getStorePickupAddress(store)
    const formattedPickup = formatStorePickupAddressFull(pickupAddr)
    addressText = `\n🏪 *Forma de Retirada:* Retirada no Local${formattedPickup ? `\n📍 *Endereço de Retirada:*\n${formattedPickup}` : ''}`
  }

  let scheduleText = ''
  if (order.scheduled_date) {
    const formattedSchedule = formatProductionSchedule(
      order.scheduled_date,
      order.scheduled_time_slot
    )
    scheduleText = `\n📅 *Agendamento / Entrega:* ${formattedSchedule}`
  }

  const message = `🛍️ *NOVO PEDIDO #${order.order_number}*
━━━━━━━━━━━━━━━━━━━━
🏪 *Loja:* ${store.name}
👤 *Cliente:* ${order.customer_name}
📱 *WhatsApp:* ${order.customer_phone}

🛒 *Itens do Pedido:*
${itemsText}
💰 *Subtotal dos Itens:* ${formatCurrency(order.subtotal)}
💵 *TOTAL:* ${formatCurrency(order.total)}${isDelivery ? ' (frete à parte via Uber Flash)' : ''}
💳 *Pagamento:* ${order.payment_method.toUpperCase()}
${addressText}${scheduleText}
${order.notes ? `\n📝 *Observações:* ${order.notes}` : ''}
━━━━━━━━━━━━━━━━━━━━
Aguardando confirmação! Obrigado.`

  return message
}

/**
 * Gera mensagem pré-formatada para o lojista falar com o comprador sobre o status do pedido.
 */
export function formatCustomerWhatsAppMessage(
  order: OrderWithItems,
  storeName?: string,
  customTemplate?: string
): string {
  const statusLabel = ORDER_STATUS_LABELS[order.status as OrderStatus] || order.status
  const storePrefix = storeName ? storeName : 'nossa loja'
  const template = customTemplate?.trim() || DEFAULT_WHATSAPP_TEMPLATES.status_update

  return template
    .replace(/{cliente}/g, order.customer_name || 'Cliente')
    .replace(/{loja}/g, storePrefix)
    .replace(/{pedido}/g, String(order.order_number))
    .replace(/{status}/g, statusLabel)
    .replace(/{total}/g, formatCurrency(order.total))
}

export function formatWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
}

/**
 * Gera mensagem para notificar o cliente via WhatsApp quando o pedido estiver PRONTO.
 */
export function formatProductionReadyWhatsAppMessage(
  order: OrderWithItems,
  storeName?: string,
  storePickupAddress?: StorePickupAddress | string | null,
  customTemplates?: WhatsAppTemplates
): string {
  const storePrefix = storeName ? storeName : 'nossa loja'
  const isDelivery = (order.delivery_method || order.delivery_type) === 'delivery'
  const address = order.delivery_address as CheckoutAddress | null

  if (isDelivery) {
    const addressStr = address
      ? `${address.street}, ${address.number}${address.neighborhood ? ` (${address.neighborhood})` : ''}`
      : 'seu endereço cadastrado'
    const template =
      customTemplates?.ready_delivery?.trim() ||
      DEFAULT_WHATSAPP_TEMPLATES.ready_delivery

    return template
      .replace(/{cliente}/g, order.customer_name || 'Cliente')
      .replace(/{loja}/g, storePrefix)
      .replace(/{pedido}/g, String(order.order_number))
      .replace(/{endereco}/g, addressStr)
      .replace(/{total}/g, formatCurrency(order.total))
  } else {
    let addressStr = ''
    if (typeof storePickupAddress === 'string' && storePickupAddress.trim()) {
      addressStr = storePickupAddress
    } else if (storePickupAddress && typeof storePickupAddress === 'object') {
      const formatted = formatStorePickupAddressFull(storePickupAddress)
      if (formatted) {
        addressStr = formatted
      }
    }

    const template =
      customTemplates?.ready_pickup?.trim() ||
      DEFAULT_WHATSAPP_TEMPLATES.ready_pickup

    return template
      .replace(/{cliente}/g, order.customer_name || 'Cliente')
      .replace(/{loja}/g, storePrefix)
      .replace(/{pedido}/g, String(order.order_number))
      .replace(/{endereco_retirada}/g, addressStr || 'Endereço da nossa loja')
      .replace(/{endereco}/g, addressStr || 'Endereço da nossa loja')
      .replace(/{total}/g, formatCurrency(order.total))
  }
}

/**
 * Gera mensagem para notificar o cliente via WhatsApp quando o pedido for CONFIRMADO automaticamente.
 */
export function formatOrderConfirmedWhatsAppMessage(
  order: OrderWithItems,
  storeName?: string,
  storePickupAddress?: StorePickupAddress | string | null
): string {
  const storePrefix = storeName ? storeName : 'nossa loja'
  const isDelivery = (order.delivery_method || order.delivery_type) === 'delivery'
  const address = order.delivery_address as CheckoutAddress | null

  let addressStr = ''
  if (isDelivery && address) {
    addressStr = `📍 *Endereço de Entrega:* ${address.street}, ${address.number}${address.neighborhood ? ` (${address.neighborhood})` : ''}`
  } else {
    let formatted = ''
    if (typeof storePickupAddress === 'string' && storePickupAddress.trim()) {
      formatted = storePickupAddress
    } else if (storePickupAddress && typeof storePickupAddress === 'object') {
      formatted = formatStorePickupAddressFull(storePickupAddress) || ''
    }
    if (formatted) {
      addressStr = `📍 *Endereço para Retirada:* ${formatted}`
    }
  }

  let scheduleStr = ''
  if (order.scheduled_date) {
    const formattedSchedule = formatProductionSchedule(
      order.scheduled_date,
      order.scheduled_time_slot
    )
    if (formattedSchedule) {
      scheduleStr = `\n📅 *Agendamento / Horário:* ${formattedSchedule}`
    }
  }

  return `Olá, *${order.customer_name || 'Cliente'}*! Tudo bem? 🍪✨
Aqui é da *${storePrefix}*.

Recebemos seu pedido *#${order.order_number}* e ele já está *CONFIRMADO* e em preparo na nossa cozinha! 👩‍🍳🔥

💵 *Total:* ${formatCurrency(order.total)}${addressStr ? `\n${addressStr}` : ''}${scheduleStr}

Assim que o seu pedido estiver pronto, avisaremos você por aqui. Muito obrigado pela preferência! 😊`
}

export interface DashboardMetrics {
  totalRevenue: number
  totalOrdersCount: number
  pendingOrdersCount: number
  paidOrdersCount: number
  averageTicket: number
}

/**
 * Calcula métricas agregadas dos pedidos da loja ou de um drop específico.
 */
export function calculateDashboardMetrics(
  orders: OrderWithItems[],
  activeDropId?: string | null
): {
  storeMetrics: DashboardMetrics
  activeDropMetrics: DashboardMetrics | null
} {
  const isPaidOrCompleted = (status: string, paymentStatus?: string | null) =>
    status === 'confirmed' ||
    status === 'delivered' ||
    status === 'out_for_delivery' ||
    status === 'ready_for_pickup' ||
    status === 'preparing' ||
    paymentStatus === 'paid'

  const computeMetrics = (orderList: OrderWithItems[]): DashboardMetrics => {
    const paidOrders = orderList.filter((o) =>
      isPaidOrCompleted(o.status, o.payment_status)
    )
    const pendingOrders = orderList.filter((o) => o.status === 'pending')
    const totalRevenue = paidOrders.reduce((acc, o) => acc + (o.total || 0), 0)
    const averageTicket =
      paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

    return {
      totalRevenue,
      totalOrdersCount: orderList.length,
      pendingOrdersCount: pendingOrders.length,
      paidOrdersCount: paidOrders.length,
      averageTicket,
    }
  }

  const storeMetrics = computeMetrics(orders)
  const activeDropMetrics = activeDropId
    ? computeMetrics(orders.filter((o) => o.drop_id === activeDropId))
    : null

  return {
    storeMetrics,
    activeDropMetrics,
  }
}

export type ProductionPeriodFilter =
  | { type: 'today' }
  | { type: 'next_7_days' }
  | { type: 'custom'; startDate: string; endDate: string }

export interface ProductionItemUnit {
  id: string
  orderId: string
  itemId: string
  orderNumber: number
  customerName: string
  customerPhone: string
  deliveryMethod: DeliveryMethod
  scheduledDate: string | null
  scheduledTimeSlot: string | null
  notes: string | null
  customizationsSummary: string | null
  isComboItem: boolean
  comboName: string | null
  productionStatus: ProductionStatus
  itemPrice: number
  unitIndex: number
  totalUnitsInItem: number
}

export interface GroupedProductProduction {
  productKey: string
  productName: string
  isFlavorChoice?: boolean
  parentProductName?: string
  totalQuantity: number
  readyQuantity: number
  pendingQuantity: number
  isAllReady: boolean
  items: ProductionItemUnit[]
}

export interface GroupedProductionTimeSlot {
  timeSlot: string // e.g. "14:00 - 15:00" ou "unspecified"
  label: string // e.g. "14:00 - 15:00" ou "Sem horário definido"
  totalOrders: number
  readyOrders: number
  isAllReady: boolean
  totalQuantity: number
  readyQuantity: number
  pendingQuantity: number
  products: GroupedProductProduction[]
}

export interface GroupedProductionDay {
  date: string // YYYY-MM-DD
  formattedDate: string // e.g. "Terça-feira, 13 de Janeiro"
  isToday: boolean
  isTomorrow: boolean
  totalOrders: number
  readyOrders: number
  isAllReady: boolean
  products: GroupedProductProduction[]
  timeSlots: GroupedProductionTimeSlot[]
}

/**
 * Formata uma data no formato YYYY-MM-DD por extenso em português (pt-BR).
 * Exemplo: '2026-01-13' -> 'Terça-feira, 13 de Janeiro'
 */
export function formatFullDatePtBr(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const [yearStr, monthStr, dayStr] = dateStr.split('-')
  const date = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr),
    12,
    0,
    0
  )

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const parts = formatter.formatToParts(date)

  let weekday = ''
  let day = ''
  let month = ''
  for (const part of parts) {
    if (part.type === 'weekday') weekday = part.value
    if (part.type === 'day') day = part.value
    if (part.type === 'month') month = part.value
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return `${capitalize(weekday)}, ${day} de ${capitalize(month)}`
}

/**
 * Agrupa os itens de uma lista de pedidos em cards de produtos consolidados.
 */
export function groupOrderItemsIntoProducts(orders: OrderWithItems[]): GroupedProductProduction[] {
  const productMap: Record<string, GroupedProductProduction> = {}

  orders.forEach((order) => {
    const prodStatus =
      (order.production_status as ProductionStatus) || 'pending'
    const deliveryMethod =
      (order.delivery_method || order.delivery_type) === 'pickup'
        ? 'pickup'
        : 'delivery'

    order.items.forEach((item, itemIdx) => {
      const customizations = item.customizations as Record<
        string,
        unknown
      > | null
      const choices = customizations?.choices as Array<{
        name: string
        quantity: number
      }> | null

      if (choices && Array.isArray(choices) && choices.length > 0) {
        // Sabores/produtos escolhidos dentro de um combo/caixa
        choices.forEach((choice, choiceIdx) => {
          const rawName = choice.name || 'Item'
          const cleanName = rawName.trim()
          const productKey = `prod_${cleanName.toLowerCase()}`
          const totalUnits = (choice.quantity || 1) * (item.quantity || 1)

          if (!productMap[productKey]) {
            productMap[productKey] = {
              productKey,
              productName: cleanName,
              totalQuantity: 0,
              readyQuantity: 0,
              pendingQuantity: 0,
              isAllReady: false,
              items: [],
            }
          }

          productMap[productKey].totalQuantity += totalUnits
          if (prodStatus === 'ready' || prodStatus === 'delivered') {
            productMap[productKey].readyQuantity += totalUnits
          } else {
            productMap[productKey].pendingQuantity += totalUnits
          }

          for (let u = 0; u < totalUnits; u++) {
            productMap[productKey].items.push({
              id: `${order.id}_item_${item.id || itemIdx}_c_${choiceIdx}_u_${u}`,
              orderId: order.id,
              itemId: item.id || `item_${itemIdx}`,
              orderNumber: order.order_number,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              deliveryMethod,
              scheduledDate: order.scheduled_date,
              scheduledTimeSlot: order.scheduled_time_slot,
              notes: item.notes || order.notes || null,
              customizationsSummary: `Combo: ${item.product_name}`,
              isComboItem: true,
              comboName: item.product_name,
              productionStatus: prodStatus,
              itemPrice: item.unit_price,
              unitIndex: u + 1,
              totalUnitsInItem: totalUnits,
            })
          }
        })
      } else {
        // Produto padrão avulso ou do drop (ou combo sem escolhas internas)
        const rawName = item.product_name || 'Produto'
        const cleanName = rawName.trim()
        const productKey = `prod_${cleanName.toLowerCase()}`
        const totalUnits = item.quantity || 1
        const isCombo = !!(
          customizations &&
          typeof customizations === 'object' &&
          'combo_id' in customizations &&
          customizations.combo_id
        )

        if (!productMap[productKey]) {
          productMap[productKey] = {
            productKey,
            productName: cleanName,
            totalQuantity: 0,
            readyQuantity: 0,
            pendingQuantity: 0,
            isAllReady: false,
            items: [],
          }
        }

        productMap[productKey].totalQuantity += totalUnits
        if (prodStatus === 'ready' || prodStatus === 'delivered') {
          productMap[productKey].readyQuantity += totalUnits
        } else {
          productMap[productKey].pendingQuantity += totalUnits
        }

        for (let u = 0; u < totalUnits; u++) {
          productMap[productKey].items.push({
            id: `${order.id}_item_${item.id || itemIdx}_u_${u}`,
            orderId: order.id,
            itemId: item.id || `item_${itemIdx}`,
            orderNumber: order.order_number,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            deliveryMethod,
            scheduledDate: order.scheduled_date,
            scheduledTimeSlot: order.scheduled_time_slot,
            notes: item.notes || order.notes || null,
            customizationsSummary: isCombo ? `Combo: ${cleanName}` : null,
            isComboItem: isCombo,
            comboName: isCombo ? cleanName : null,
            productionStatus: prodStatus,
            itemPrice: item.unit_price,
            unitIndex: u + 1,
            totalUnitsInItem: totalUnits,
          })
        }
      }
    })
  })

  // Calcular isAllReady para cada produto e ordenar os produtos
  const products = Object.values(productMap).map((prod) => ({
    ...prod,
    isAllReady: prod.readyQuantity === prod.totalQuantity && prod.totalQuantity > 0,
    pendingQuantity: Math.max(0, prod.totalQuantity - prod.readyQuantity),
    items: prod.items.sort((a, b) => {
      const slotA = a.scheduledTimeSlot || '99:99'
      const slotB = b.scheduledTimeSlot || '99:99'
      if (slotA !== slotB) return slotA.localeCompare(slotB)
      return a.orderNumber - b.orderNumber
    }),
  }))

  // Ordenar produtos: com mais unidades primeiro
  products.sort((a, b) => b.totalQuantity - a.totalQuantity)

  return products
}

/**
 * Agrupa os pedidos para a visualização de produção de cozinha (All Day),
 * filtrando EXCLUSIVAMENTE pedidos sob encomenda (com scheduled_date),
 * e organizando por dia e dividindo por horário de entrega (scheduled_time_slot).
 */
export function groupOrdersForKitchenProduction(
  orders: OrderWithItems[],
  filter: ProductionPeriodFilter,
  referenceDateStr?: string
): GroupedProductionDay[] {
  // Data base de referência (hoje em YYYY-MM-DD)
  const today = referenceDateStr || new Date().toISOString().split('T')[0]

  const getRelativeDateStr = (baseStr: string, daysOffset: number): string => {
    const [y, m, d] = baseStr.split('-').map(Number)
    const date = new Date(y, m - 1, d, 12, 0, 0)
    date.setDate(date.getDate() + daysOffset)
    const nextY = date.getFullYear()
    const nextM = String(date.getMonth() + 1).padStart(2, '0')
    const nextD = String(date.getDate()).padStart(2, '0')
    return `${nextY}-${nextM}-${nextD}`
  }

  const tomorrow = getRelativeDateStr(today, 1)

  let minDate: string | null = null
  let maxDate: string | null = null

  if (filter.type === 'today') {
    minDate = today
    maxDate = today
  } else if (filter.type === 'next_7_days') {
    minDate = today
    maxDate = getRelativeDateStr(today, 6)
  } else if (filter.type === 'custom') {
    minDate = filter.startDate || null
    maxDate = filter.endDate || null
  }

  // 1. Filtrar pedidos válidos: apenas pedidos sob ENCOMENDA (possuem scheduled_date preenchido)
  const dayMap: Record<string, OrderWithItems[]> = {}

  orders.forEach((order) => {
    // Ignorar cancelados
    if (order.status === 'cancelled') return

    // Ignorar pedidos de pronta-entrega (que não possuem scheduled_date)
    if (!order.scheduled_date || order.scheduled_date.trim() === '') return

    const orderDate = order.scheduled_date

    if (minDate && orderDate < minDate) return
    if (maxDate && orderDate > maxDate) return

    if (!dayMap[orderDate]) {
      dayMap[orderDate] = []
    }
    dayMap[orderDate].push(order)
  })

  // 2. Ordenar as datas cronologicamente
  const sortedDates = Object.keys(dayMap).sort((a, b) => a.localeCompare(b))

  return sortedDates.map((dateStr) => {
    const dayOrders = dayMap[dateStr]
    const totalOrders = dayOrders.length
    const readyOrders = dayOrders.filter(
      (o) => o.production_status === 'ready' || o.production_status === 'delivered'
    ).length
    const isAllReady = readyOrders === totalOrders && totalOrders > 0

    // Consolidado geral de produtos do dia todo
    const dayProducts = groupOrderItemsIntoProducts(dayOrders)

    // Agrupamento por horário de entrega (scheduled_time_slot)
    const slotMap: Record<string, OrderWithItems[]> = {}
    dayOrders.forEach((order) => {
      const slot = (order.scheduled_time_slot && order.scheduled_time_slot.trim()) || 'unspecified'
      if (!slotMap[slot]) {
        slotMap[slot] = []
      }
      slotMap[slot].push(order)
    })

    // Ordenar as faixas de horário (cronológica, com 'unspecified' ao final)
    const sortedSlotKeys = Object.keys(slotMap).sort((a, b) => {
      if (a === 'unspecified') return 1
      if (b === 'unspecified') return -1
      return a.localeCompare(b, undefined, { numeric: true })
    })

    const timeSlots: GroupedProductionTimeSlot[] = sortedSlotKeys.map((slotKey) => {
      const slotOrders = slotMap[slotKey]
      const slotProducts = groupOrderItemsIntoProducts(slotOrders)
      const slotTotalOrders = slotOrders.length
      const slotReadyOrders = slotOrders.filter(
        (o) => o.production_status === 'ready' || o.production_status === 'delivered'
      ).length
      const slotTotalQuantity = slotProducts.reduce((acc, p) => acc + p.totalQuantity, 0)
      const slotReadyQuantity = slotProducts.reduce((acc, p) => acc + p.readyQuantity, 0)
      const slotPendingQuantity = Math.max(0, slotTotalQuantity - slotReadyQuantity)
      const slotIsAllReady = slotReadyQuantity === slotTotalQuantity && slotTotalQuantity > 0

      return {
        timeSlot: slotKey,
        label: slotKey === 'unspecified' ? 'Sem horário definido' : slotKey,
        totalOrders: slotTotalOrders,
        readyOrders: slotReadyOrders,
        isAllReady: slotIsAllReady,
        totalQuantity: slotTotalQuantity,
        readyQuantity: slotReadyQuantity,
        pendingQuantity: slotPendingQuantity,
        products: slotProducts,
      }
    })

    return {
      date: dateStr,
      formattedDate: formatFullDatePtBr(dateStr),
      isToday: dateStr === today,
      isTomorrow: dateStr === tomorrow,
      totalOrders,
      readyOrders,
      isAllReady,
      products: dayProducts,
      timeSlots,
    }
  })
}

export type OrdersSortOption =
  | 'urgency'
  | 'delivery_date_asc'
  | 'time_slot_asc'
  | 'total_desc'
  | 'created_at_desc'

export const ORDERS_SORT_LABELS: Record<OrdersSortOption, string> = {
  urgency: 'Grau de Urgência (Pronta-entrega ➔ Encomendas ➔ Finalizados)',
  delivery_date_asc: 'Data de Entrega (Mais próximos primeiro)',
  time_slot_asc: 'Horário de Entrega/Retirada',
  total_desc: 'Valor Total do Pedido (Maior ➔ Menor)',
  created_at_desc: 'Data da Compra (Mais recentes)',
}

/**
 * Calcula há quanto tempo o pedido foi realizado em formato amigável.
 * Exemplo: 'Realizado há 12 min', 'Realizado há 1h 25min', 'Realizado há menos de 1 min'
 */
export function formatElapsedTime(createdAt: string, nowInput?: Date | number): string {
  if (!createdAt) return ''
  const createdTime = new Date(createdAt).getTime()
  const now = typeof nowInput === 'number' ? nowInput : nowInput ? nowInput.getTime() : Date.now()
  const diffMs = Math.max(0, now - createdTime)

  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMin < 1) {
    return 'Realizado há menos de 1 min'
  }
  if (diffMin < 60) {
    return `Realizado há ${diffMin} min`
  }
  if (diffHours < 24) {
    const remainingMin = diffMin % 60
    if (remainingMin === 0) {
      return `Realizado há ${diffHours}h`
    }
    return `Realizado há ${diffHours}h ${remainingMin}min`
  }
  if (diffDays === 1) {
    return 'Realizado ontem'
  }
  return `Realizado há ${diffDays} dias`
}

/**
 * Helper para identificar o Grau de Urgência de um pedido:
 * 1º Lugar (Tier 1): Pronta-Entrega em aberto/pendente (máxima prioridade operacional)
 * 2º Lugar (Tier 2): Encomenda em aberto/pendente (programada)
 * 3º Lugar (Tier 3): Pedidos já finalizados, prontos ou cancelados
 */
export function getOrderUrgencyTier(order: OrderWithItems): number {
  const isCompleted =
    order.production_status === 'ready' ||
    order.production_status === 'delivered' ||
    order.status === 'cancelled'

  if (isCompleted) {
    return 3
  }

  const isReadyDelivery = !order.scheduled_date || order.scheduled_date === ''
  if (isReadyDelivery) {
    return 1
  }

  return 2
}

/**
 * Formata a data de entrega e janela de horário de forma compacta.
 * Exemplo: '28/08 • 14:00 - 15:00' ou 'Hoje • 14:00 - 15:00'
 */
export function formatOrderScheduleCompact(
  scheduledDate?: string | null,
  scheduledTimeSlot?: string | null,
  referenceDateStr?: string
): string {
  if (!scheduledDate) {
    return 'Pronta-Entrega'
  }
  const today = referenceDateStr || new Date().toISOString().split('T')[0]
  const [y, m, d] = scheduledDate.split('-')
  let datePart = `${d}/${m}`
  if (scheduledDate === today) {
    datePart = 'Hoje'
  }
  return scheduledTimeSlot ? `${datePart} • ${scheduledTimeSlot}` : datePart
}

/**
 * Filtra e ordena a lista de pedidos para a aba "📜 Pedidos".
 */
export function filterAndSortOrders(
  orders: OrderWithItems[],
  options: {
    filterOpen: boolean
    filterReady: boolean
    sortBy: OrdersSortOption
    search: string
  }
): OrderWithItems[] {
  const { filterOpen, filterReady, sortBy, search } = options

  // 1. Filtrar por status aberto vs pronto
  let filtered = orders.filter((order) => {
    // Se ambos marcados ou ambos desmarcados -> exibir todos os pedidos
    const showAll = (filterOpen && filterReady) || (!filterOpen && !filterReady)
    if (showAll) return true

    const isReady =
      order.production_status === 'ready' ||
      order.production_status === 'delivered'
    const isOpen = !isReady

    if (filterOpen && isOpen) return true
    if (filterReady && isReady) return true

    return false
  })

  // 2. Filtrar por busca (nº pedido, cliente, telefone)
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter((order) => {
      const matchNumber = order.order_number.toString().includes(q)
      const matchName = order.customer_name.toLowerCase().includes(q)
      const matchPhone = order.customer_phone.toLowerCase().includes(q)
      return matchNumber || matchName || matchPhone
    })
  }

  // 3. Ordenação por Grau de Urgência e outros critérios
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'urgency': {
        const tierA = getOrderUrgencyTier(a)
        const tierB = getOrderUrgencyTier(b)

        if (tierA !== tierB) {
          return tierA - tierB
        }

        // 1º Lugar: Pronta-Entrega em aberto (mais antigos primeiro para agilidade)
        if (tierA === 1) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        // 2º Lugar: Encomendas em aberto (data/horário mais próximo primeiro)
        if (tierA === 2) {
          const dateA = a.scheduled_date || '9999-99-99'
          const dateB = b.scheduled_date || '9999-99-99'
          if (dateA !== dateB) return dateA.localeCompare(dateB)
          const slotA = a.scheduled_time_slot || '99:99'
          const slotB = b.scheduled_time_slot || '99:99'
          if (slotA !== slotB) return slotA.localeCompare(slotB)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }

        // 3º Lugar: Pedidos Finalizados (mais recentes primeiro)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      case 'delivery_date_asc': {
        const dateA = a.scheduled_date || '9999-99-99'
        const dateB = b.scheduled_date || '9999-99-99'
        if (dateA !== dateB) return dateA.localeCompare(dateB)
        const slotA = a.scheduled_time_slot || '99:99'
        const slotB = b.scheduled_time_slot || '99:99'
        if (slotA !== slotB) return slotA.localeCompare(slotB)
        return b.order_number - a.order_number
      }
      case 'time_slot_asc': {
        const slotA = a.scheduled_time_slot || '99:99'
        const slotB = b.scheduled_time_slot || '99:99'
        if (slotA !== slotB) return slotA.localeCompare(slotB)
        const dateA = a.scheduled_date || '9999-99-99'
        const dateB = b.scheduled_date || '9999-99-99'
        return dateA.localeCompare(dateB)
      }
      case 'total_desc':
        return (b.total || 0) - (a.total || 0)
      case 'created_at_desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      default:
        return 0
    }
  })

  return sorted
}

export type OrderKanbanColumn = 'awaiting_confirmation' | 'preparing' | 'ready'

export interface KanbanOrdersGroup {
  awaitingConfirmation: OrderWithItems[]
  preparing: OrderWithItems[]
  ready: OrderWithItems[]
  delivered: OrderWithItems[]
  cancelled: OrderWithItems[]
}

/**
 * Classifica um pedido em sua respectiva coluna do Kanban operacional ou histórico.
 */
export function getOrderKanbanColumn(
  order: OrderWithItems
): OrderKanbanColumn | 'delivered' | 'cancelled' {
  if (order.status === 'cancelled') {
    return 'cancelled'
  }
  if (order.status === 'delivered' || order.production_status === 'delivered') {
    return 'delivered'
  }
  if (
    order.production_status === 'ready' ||
    order.status === 'ready_for_pickup' ||
    order.status === 'out_for_delivery'
  ) {
    return 'ready'
  }
  if (
    order.status === 'preparing' ||
    order.production_status === 'preparing' ||
    order.status === 'confirmed'
  ) {
    return 'preparing'
  }
  return 'awaiting_confirmation'
}

/**
 * Agrupa os pedidos nas 3 colunas ativas do Kanban e listas de histórico.
 */
export function groupOrdersByKanbanColumn(orders: OrderWithItems[]): KanbanOrdersGroup {
  const groups: KanbanOrdersGroup = {
    awaitingConfirmation: [],
    preparing: [],
    ready: [],
    delivered: [],
    cancelled: [],
  }

  orders.forEach((order) => {
    const col = getOrderKanbanColumn(order)
    if (col === 'awaiting_confirmation') {
      groups.awaitingConfirmation.push(order)
    } else if (col === 'preparing') {
      groups.preparing.push(order)
    } else if (col === 'ready') {
      groups.ready.push(order)
    } else if (col === 'delivered') {
      groups.delivered.push(order)
    } else if (col === 'cancelled') {
      groups.cancelled.push(order)
    }
  })

  return groups
}
