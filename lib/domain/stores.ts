import { z } from 'zod'
import type { Database, Json } from '@/types/database.types'

export const pixKeyTypeEnum = z.enum(['cpf', 'cnpj', 'email', 'phone', 'random'])
export type PixKeyType = z.infer<typeof pixKeyTypeEnum>

export const dayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
])
export type DayOfWeek = z.infer<typeof dayOfWeekEnum>

export const dayScheduleSchema = z.object({
  isOpen: z.boolean(),
  open: z.string(), // "10:00"
  close: z.string(), // "18:00"
})
export type DaySchedule = z.infer<typeof dayScheduleSchema>

export const businessHoursSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
})
export type BusinessHours = z.infer<typeof businessHoursSchema>

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { isOpen: true, open: '10:00', close: '18:00' },
  tuesday: { isOpen: true, open: '10:00', close: '18:00' },
  wednesday: { isOpen: true, open: '10:00', close: '18:00' },
  thursday: { isOpen: true, open: '10:00', close: '18:00' },
  friday: { isOpen: true, open: '10:00', close: '18:00' },
  saturday: { isOpen: true, open: '10:00', close: '18:00' },
  sunday: { isOpen: false, open: '', close: '' },
}

export const DAYS_OF_WEEK: {
  key: DayOfWeek
  label: string
  shortLabel: string
  dayIndex: number
}[] = [
  { key: 'monday', label: 'Segunda-feira', shortLabel: 'Seg', dayIndex: 1 },
  { key: 'tuesday', label: 'Terça-feira', shortLabel: 'Ter', dayIndex: 2 },
  { key: 'wednesday', label: 'Quarta-feira', shortLabel: 'Qua', dayIndex: 3 },
  { key: 'thursday', label: 'Quinta-feira', shortLabel: 'Qui', dayIndex: 4 },
  { key: 'friday', label: 'Sexta-feira', shortLabel: 'Sex', dayIndex: 5 },
  { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb', dayIndex: 6 },
  { key: 'sunday', label: 'Domingo', shortLabel: 'Dom', dayIndex: 0 },
]

export const locationTypeEnum = z.enum(['store', 'house', 'condo'])
export type LocationType = z.infer<typeof locationTypeEnum>

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  store: 'Loja comercial / Ponto físico',
  house: 'Casa / Residência',
  condo: 'Condomínio / Edifício / Sala',
}

export const LOCATION_TYPE_SHORT_LABELS: Record<LocationType, string> = {
  store: 'Loja comercial',
  house: 'Casa',
  condo: 'Condomínio',
}

export const storePickupAddressSchema = z.object({
  location_type: locationTypeEnum.default('store'),
  street: z.string().min(2, 'Informe a rua / logradouro.').max(255),
  number: z.string().min(1, 'Informe o número ou S/N.').max(50),
  complement: z.string().max(100).nullable().optional().or(z.literal('')),
  neighborhood: z.string().min(2, 'Informe o bairro.').max(100),
  city: z.string().min(2, 'Informe a cidade.').max(100),
  state: z.string().min(2, 'Informe o estado / UF.').max(2),
  zip_code: z.string().max(20).nullable().optional().or(z.literal('')),
  reference: z.string().max(255).nullable().optional().or(z.literal('')),
  instructions: z.string().max(500).nullable().optional().or(z.literal('')),
})

export type StorePickupAddress = z.infer<typeof storePickupAddressSchema>

export const whatsappTemplatesSchema = z.object({
  ready_delivery: z.string().optional(),
  ready_pickup: z.string().optional(),
  status_update: z.string().optional(),
})

export type WhatsAppTemplates = z.infer<typeof whatsappTemplatesSchema>

export const DEFAULT_WHATSAPP_TEMPLATES: Record<'ready_delivery' | 'ready_pickup' | 'status_update', string> = {
  ready_delivery: `Olá, *{cliente}*! Tudo bem? 🍪✨
Aqui é da *{loja}*.

Seu pedido *#{pedido}* acabou de ficar *PRONTO*! 🛵🎉

Estamos organizando o envio via Uber Flash para:
📍 *Endereço:* {endereco}

Podemos solicitar o motorista agora? Por favor, confirme se tem alguém no local para receber!`,

  ready_pickup: `Olá, *{cliente}*! Tudo bem? 🍪✨
Aqui é da *{loja}*.

Passando para avisar que o seu pedido *#{pedido}* está *PRONTO para retirada*! 🛍️🎉

📍 *Endereço para Retirada:*
{endereco_retirada}

Pode passar para retirar quando desejar. Estamos te esperando!`,

  status_update: `Olá, *{cliente}*! Tudo bem?
Aqui é da *{loja}*.

Estamos passando para atualizar o status do seu pedido *#{pedido}*:
📌 *Status Atual:* {status}
💵 *Total:* {total}

Caso precise de qualquer informação ou tenha alguma dúvida, basta nos responder aqui por esta conversa! 😊`,
}

export const fontIdEnum = z.enum([
  'Inter',
  'Roboto',
  'Montserrat',
  'Playfair Display',
  'Poppins',
  'Plus Jakarta Sans',
  'Lora',
  'Oswald',
  'Raleway',
  'Outfit',
])
export type FontId = z.infer<typeof fontIdEnum>

export const fontWeightEnum = z.enum(['light', 'regular', 'bold'])
export type FontWeight = z.infer<typeof fontWeightEnum>

export const storeThemeSchema = z.object({
  primary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor primária deve ser um código hexadecimal válido.')
    .default('#000000'),
  secondary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor secundária deve ser um código hexadecimal válido.')
    .default('#4f46e5'),
  background_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor de fundo deve ser um código hexadecimal válido.')
    .default('#f9fafb'),
  card_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor do card deve ser um código hexadecimal válido.')
    .default('#ffffff'),
  text_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor do texto deve ser um código hexadecimal válido.')
    .default('#171717'),
  font_family: fontIdEnum.default('Inter'),
  font_weight: fontWeightEnum.default('regular'),
})

export type StoreTheme = z.infer<typeof storeThemeSchema>

export const DEFAULT_STORE_THEME: StoreTheme = {
  primary_color: '#000000',
  secondary_color: '#4f46e5',
  background_color: '#f9fafb',
  card_color: '#ffffff',
  text_color: '#171717',
  font_family: 'Inter',
  font_weight: 'regular',
}

export interface ApprovedGoogleFont {
  id: FontId
  name: string
  category: 'sans-serif' | 'serif' | 'display'
  googleFamily: string
  cssFamily: string
  description: string
}

export const APPROVED_GOOGLE_FONTS: ApprovedGoogleFont[] = [
  {
    id: 'Inter',
    name: 'Inter',
    category: 'sans-serif',
    googleFamily: 'Inter:wght@300;400;500;600;700',
    cssFamily: "'Inter', sans-serif",
    description: 'Moderna, equilibrada e com excelente legibilidade em qualquer tela.',
  },
  {
    id: 'Roboto',
    name: 'Roboto',
    category: 'sans-serif',
    googleFamily: 'Roboto:wght@300;400;500;700',
    cssFamily: "'Roboto', sans-serif",
    description: 'Neutra, geométrica e clássica para catálogos e e-commerce.',
  },
  {
    id: 'Montserrat',
    name: 'Montserrat',
    category: 'sans-serif',
    googleFamily: 'Montserrat:wght@300;400;500;600;700;800',
    cssFamily: "'Montserrat', sans-serif",
    description: 'Geométrica, sofisticada e marcante para marcas modernas.',
  },
  {
    id: 'Playfair Display',
    name: 'Playfair Display',
    category: 'serif',
    googleFamily: 'Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400',
    cssFamily: "'Playfair Display', serif",
    description: 'Clássica, elegante e refinada. Perfeita para docerias gourmet e confeitarias finas.',
  },
  {
    id: 'Poppins',
    name: 'Poppins',
    category: 'sans-serif',
    googleFamily: 'Poppins:wght@300;400;500;600;700',
    cssFamily: "'Poppins', sans-serif",
    description: 'Arredondada, calorosa e moderna, transmitindo simpatia e leveza.',
  },
  {
    id: 'Plus Jakarta Sans',
    name: 'Plus Jakarta Sans',
    category: 'sans-serif',
    googleFamily: 'Plus+Jakarta+Sans:wght@300;400;500;600;700;800',
    cssFamily: "'Plus Jakarta Sans', sans-serif",
    description: 'Design premium contemporâneo, limpo e com excelente acabamento.',
  },
  {
    id: 'Lora',
    name: 'Lora',
    category: 'serif',
    googleFamily: 'Lora:ital,wght@0,400;0,500;0,600;0,700;1,400',
    cssFamily: "'Lora', serif",
    description: 'Serifada artística e aconchegante, ideal para marcas tradicionais e artesanais.',
  },
  {
    id: 'Oswald',
    name: 'Oswald',
    category: 'display',
    googleFamily: 'Oswald:wght@300;400;500;600;700',
    cssFamily: "'Oswald', sans-serif",
    description: 'Condensada e impactante. Ótima para hamburguerias, lanchonetes e marcas fortes.',
  },
  {
    id: 'Raleway',
    name: 'Raleway',
    category: 'sans-serif',
    googleFamily: 'Raleway:wght@300;400;500;600;700;800',
    cssFamily: "'Raleway', sans-serif",
    description: 'Traços elegantes e distintos, com acabamento refinado para alta gastronomia.',
  },
  {
    id: 'Outfit',
    name: 'Outfit',
    category: 'sans-serif',
    googleFamily: 'Outfit:wght@300;400;500;600;700',
    cssFamily: "'Outfit', sans-serif",
    description: 'Geométrica humanista, contemporânea, vibrante e muito dinâmica.',
  },
]

export interface ThemePreset {
  id: string
  name: string
  description: string
  previewPrimary: string
  previewSecondary: string
  previewBg: string
  previewCard: string
  theme: StoreTheme
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'clean-dark',
    name: 'Minimalista Preto & Branco',
    description: 'Elegância monocromática para vitrines modernas e discretas.',
    previewPrimary: '#18181b',
    previewSecondary: '#64748b',
    previewBg: '#f8fafc',
    previewCard: '#ffffff',
    theme: {
      primary_color: '#18181b',
      secondary_color: '#64748b',
      background_color: '#f8fafc',
      card_color: '#ffffff',
      text_color: '#0f172a',
      font_family: 'Inter',
      font_weight: 'regular',
    },
  },
  {
    id: 'sweet-pastel',
    name: 'Doceria & Confeitaria Pastel',
    description: 'Tons rosados e acolhedores com tipografia serifada gourmet.',
    previewPrimary: '#db2777',
    previewSecondary: '#f472b6',
    previewBg: '#fff1f2',
    previewCard: '#ffffff',
    theme: {
      primary_color: '#db2777',
      secondary_color: '#f472b6',
      background_color: '#fff1f2',
      card_color: '#ffffff',
      text_color: '#831843',
      font_family: 'Playfair Display',
      font_weight: 'regular',
    },
  },
  {
    id: 'dark-gourmet',
    name: 'Dark Premium Gourmet',
    description: 'Fundo escuro dramático com acentos dourados e visual de alta gastronomia.',
    previewPrimary: '#f59e0b',
    previewSecondary: '#d97706',
    previewBg: '#09090b',
    previewCard: '#18181b',
    theme: {
      primary_color: '#f59e0b',
      secondary_color: '#d97706',
      background_color: '#09090b',
      card_color: '#18181b',
      text_color: '#f4f4f5',
      font_family: 'Montserrat',
      font_weight: 'bold',
    },
  },
  {
    id: 'bakery-artisan',
    name: 'Padaria & Café Artesanal',
    description: 'Tons quentes de caramelo e café com sensação acolhedora.',
    previewPrimary: '#854d0e',
    previewSecondary: '#b45309',
    previewBg: '#fefce8',
    previewCard: '#ffffff',
    theme: {
      primary_color: '#854d0e',
      secondary_color: '#b45309',
      background_color: '#fefce8',
      card_color: '#ffffff',
      text_color: '#451a03',
      font_family: 'Lora',
      font_weight: 'regular',
    },
  },
  {
    id: 'fresh-green',
    name: 'Fresh & Saudável',
    description: 'Verde esmeralda fresco, natural e com alta clareza visual.',
    previewPrimary: '#059669',
    previewSecondary: '#10b981',
    previewBg: '#f0fdf4',
    previewCard: '#ffffff',
    theme: {
      primary_color: '#059669',
      secondary_color: '#10b981',
      background_color: '#f0fdf4',
      card_color: '#ffffff',
      text_color: '#064e3b',
      font_family: 'Plus Jakarta Sans',
      font_weight: 'regular',
    },
  },
  {
    id: 'burger-fire',
    name: 'Burger & Steakhouse',
    description: 'Vermelho intenso e escuro, dinâmico e com presença marcante.',
    previewPrimary: '#dc2626',
    previewSecondary: '#ea580c',
    previewBg: '#18181b',
    previewCard: '#27272a',
    theme: {
      primary_color: '#dc2626',
      secondary_color: '#ea580c',
      background_color: '#18181b',
      card_color: '#27272a',
      text_color: '#fafafa',
      font_family: 'Oswald',
      font_weight: 'bold',
    },
  },
  {
    id: 'modern-indigo',
    name: 'Modern Indigo',
    description: 'Vibrante, tecnológico e elegante com azul índigo contemporâneo.',
    previewPrimary: '#4f46e5',
    previewSecondary: '#7c3aed',
    previewBg: '#f5f3ff',
    previewCard: '#ffffff',
    theme: {
      primary_color: '#4f46e5',
      secondary_color: '#7c3aed',
      background_color: '#f5f3ff',
      card_color: '#ffffff',
      text_color: '#1e1b4b',
      font_family: 'Outfit',
      font_weight: 'regular',
    },
  },
]

export const storeSettingsSchema = z.object({
  opening_hours: z.record(z.string(), z.string()).optional(),
  min_order_value: z.number().nonnegative().optional().default(0),
  delivery_fee: z.number().nonnegative().optional().default(0),
  allow_pickup: z.boolean().optional().default(true),
  allow_delivery: z.boolean().optional().default(true),
  auto_confirm_orders: z.boolean().optional().default(false),
  pickup_address: storePickupAddressSchema.nullable().optional(),
  whatsapp_templates: whatsappTemplatesSchema.nullable().optional(),
  theme: storeThemeSchema.nullable().optional(),
})

export type StoreSettings = z.infer<typeof storeSettingsSchema>

/**
 * Retorna se a confirmação automática de pedidos está habilitada para a loja.
 */
export function isStoreAutoConfirmOrders(
  store?: Store | Record<string, unknown> | null
): boolean {
  if (!store) return false
  if ('settings' in store && store.settings && typeof store.settings === 'object') {
    const s = store.settings as Record<string, unknown>
    return Boolean(s.auto_confirm_orders)
  }
  return false
}

// Schema para formulário de configurações e criação/atualização de loja
export const storeFormSchema = z.object({
  name: z
    .string()
    .min(2, 'O nome da loja deve ter pelo menos 2 caracteres.')
    .max(255, 'O nome da loja deve ter no máximo 255 caracteres.'),
  slug: z
    .string()
    .min(2, 'O slug deve ter pelo menos 2 caracteres.')
    .max(100, 'O slug deve ter no máximo 100 caracteres.')
    .regex(
      /^[a-z0-9-]+$/,
      'O slug deve conter apenas letras minúsculas, números e hífens.'
    ),
  whatsapp_number: z
    .string()
    .min(10, 'O WhatsApp deve ter pelo menos 10 dígitos (DDD + número).')
    .max(30, 'Número de WhatsApp inválido.'),
  pix_key_type: pixKeyTypeEnum.nullable().optional(),
  pix_key: z
    .string()
    .max(255, 'A chave PIX deve ter no máximo 255 caracteres.')
    .nullable()
    .optional(),
  pix_merchant_name: z
    .string()
    .max(255, 'O nome do titular deve ter no máximo 255 caracteres.')
    .nullable()
    .optional(),
  pix_merchant_city: z
    .string()
    .max(255, 'A cidade deve ter no máximo 255 caracteres.')
    .nullable()
    .optional(),
  primary_color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Cor primária deve ser um código hexadecimal válido.')
    .optional()
    .default('#000000'),
  description: z.string().max(1000).nullable().optional(),
  logo_url: z.string().url().nullable().optional().or(z.literal('')),
  banner_url: z.string().url().nullable().optional().or(z.literal('')),
  phone: z.string().max(30).nullable().optional(),
  business_hours: businessHoursSchema.nullable().optional(),
  pickup_address: storePickupAddressSchema.nullable().optional(),
  whatsapp_templates: whatsappTemplatesSchema.nullable().optional(),
  theme: storeThemeSchema.nullable().optional(),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type StoreFormInput = z.infer<typeof storeFormSchema>

export type Store = Database['public']['Tables']['stores']['Row']
export type StoreInsert = Database['public']['Tables']['stores']['Insert']
export type StoreUpdate = Database['public']['Tables']['stores']['Update']

// Funções puras de regras de negócio
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
    .replace(/\s+/g, '-') // substitui espaços por hífens
    .replace(/-+/g, '-') // remove hífens duplicados
    .replace(/^-+|-+$/g, '') // remove hífens no início e fim
}

export function formatWhatsApp(phone: string): string {
  return phone.replace(/\D/g, '')
}

/**
 * Extrai o endereço de retirada da loja a partir do campo settings ou pickup_address.
 */
export function getStorePickupAddress(
  store?: Store | Record<string, unknown> | null
): StorePickupAddress | null {
  if (!store) return null

  // 1. Tenta extrair de store.settings.pickup_address
  if ('settings' in store && store.settings && typeof store.settings === 'object') {
    const s = store.settings as Record<string, unknown>
    if (s.pickup_address && typeof s.pickup_address === 'object') {
      const parsed = storePickupAddressSchema.safeParse(s.pickup_address)
      if (parsed.success) return parsed.data
    }
  }

  // 2. Tenta extrair diretamente se passado como pickup_address
  if ('pickup_address' in store && store.pickup_address && typeof store.pickup_address === 'object') {
    const parsed = storePickupAddressSchema.safeParse(store.pickup_address)
    if (parsed.success) return parsed.data
  }

  return null
}

/**
 * Extrai os templates de mensagens do WhatsApp da loja a partir de settings ou whatsapp_templates.
 * Se não houver personalização, retorna os templates padrão do sistema.
 */
export function getStoreWhatsAppTemplates(
  store?: Store | Record<string, unknown> | null
): Record<'ready_delivery' | 'ready_pickup' | 'status_update', string> {
  const defaults = { ...DEFAULT_WHATSAPP_TEMPLATES }
  if (!store) return defaults

  // 1. Tenta extrair de store.settings.whatsapp_templates
  if ('settings' in store && store.settings && typeof store.settings === 'object') {
    const s = store.settings as Record<string, unknown>
    if (s.whatsapp_templates && typeof s.whatsapp_templates === 'object') {
      const parsed = whatsappTemplatesSchema.safeParse(s.whatsapp_templates)
      if (parsed.success) {
        return {
          ready_delivery: parsed.data.ready_delivery?.trim() || defaults.ready_delivery,
          ready_pickup: parsed.data.ready_pickup?.trim() || defaults.ready_pickup,
          status_update: parsed.data.status_update?.trim() || defaults.status_update,
        }
      }
    }
  }

  // 2. Tenta extrair de store.whatsapp_templates
  if ('whatsapp_templates' in store && store.whatsapp_templates && typeof store.whatsapp_templates === 'object') {
    const parsed = whatsappTemplatesSchema.safeParse(store.whatsapp_templates)
    if (parsed.success) {
      return {
        ready_delivery: parsed.data.ready_delivery?.trim() || defaults.ready_delivery,
        ready_pickup: parsed.data.ready_pickup?.trim() || defaults.ready_pickup,
        status_update: parsed.data.status_update?.trim() || defaults.status_update,
      }
    }
  }

  return defaults
}


/**
 * Formata o endereço de retirada completo em formato brasileiro.
 * Exemplo: "Rua das Flores, 123, Bloco B (Condomínio) - Bairro Jardim, São Paulo - SP, CEP 01234-567"
 */
export function formatStorePickupAddressFull(
  address?: StorePickupAddress | null
): string | null {
  if (!address || !address.street) return null

  const parts: string[] = []

  let main = `${address.street}, ${address.number}`
  if (address.complement) {
    main += ` - ${address.complement}`
  }
  parts.push(main)

  if (address.neighborhood) {
    parts.push(address.neighborhood)
  }

  const cityState = [address.city, address.state].filter(Boolean).join(' - ')
  if (cityState) {
    parts.push(cityState)
  }

  if (address.zip_code) {
    parts.push(`CEP ${address.zip_code}`)
  }

  let text = parts.join(', ')

  if (address.location_type) {
    const locLabel = LOCATION_TYPE_SHORT_LABELS[address.location_type]
    if (locLabel) {
      text += ` (${locLabel})`
    }
  }

  if (address.reference) {
    text += `\n📍 *Ponto de ref:* ${address.reference}`
  }

  if (address.instructions) {
    text += `\nℹ️ *Instruções:* ${address.instructions}`
  }

  return text
}

/**
 * Formata o endereço de retirada de forma compacta (para cabeçalhos e badges da vitrine).
 * Exemplo: "Rua das Flores, 123 - Bairro Jardim, São Paulo/SP"
 */
export function formatStorePickupAddressCompact(
  address?: StorePickupAddress | null
): string | null {
  if (!address || !address.street) return null

  let res = `${address.street}, ${address.number}`
  if (address.neighborhood) {
    res += ` - ${address.neighborhood}`
  }
  if (address.city) {
    res += `, ${address.city}`
    if (address.state) {
      res += `/${address.state}`
    }
  }
  return res
}

export type StoreOpenStatus = {
  isOpen: boolean
  message: string
  nextOpening: string | null
  todaySchedule: DaySchedule | null
}

const JS_DAY_TO_KEY: Record<number, DayOfWeek> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
}

/**
 * Helper puro que compara o horário atual do navegador (ou data passada) com a matriz
 * de horários da semana da loja. Também respeita o fechamento manual (pausa).
 */
export function isStoreOpen(
  store?: Store | Record<string, unknown> | null,
  now?: Date
): StoreOpenStatus {
  // Se não houver loja, consideramos aberto por padrão
  if (!store) {
    return {
      isOpen: true,
      message: 'Aberto agora',
      nextOpening: null,
      todaySchedule: null,
    }
  }

  // Verifica se o lojista fechou a loja manualmente
  let isManuallyClosed = false
  if ('settings' in store && store.settings && typeof store.settings === 'object') {
    const s = store.settings as Record<string, unknown>
    if (s.manual_closure === true) {
      isManuallyClosed = true
    }
  }

  if (isManuallyClosed) {
    return {
      isOpen: false,
      message: 'Pausado',
      nextOpening: null,
      todaySchedule: null,
    }
  }

  const rawBusinessHours = 'business_hours' in store ? store.business_hours : null

  // Se não houver configuração de horário, consideramos aberto por padrão
  if (!rawBusinessHours) {
    return {
      isOpen: true,
      message: 'Aberto agora',
      nextOpening: null,
      todaySchedule: null,
    }
  }

  const parseResult = businessHoursSchema.safeParse(rawBusinessHours)
  const businessHours = parseResult.success ? parseResult.data : null

  if (!businessHours) {
    return {
      isOpen: true,
      message: 'Aberto agora',
      nextOpening: null,
      todaySchedule: null,
    }
  }

  const currentDate = now ?? new Date()
  const jsDay = currentDate.getDay() // 0 = sunday, 1 = monday, ...
  const todayKey = JS_DAY_TO_KEY[jsDay]
  const todaySchedule = businessHours[todayKey]

  const currentHours = currentDate.getHours().toString().padStart(2, '0')
  const currentMinutes = currentDate.getMinutes().toString().padStart(2, '0')
  const currentTime = `${currentHours}:${currentMinutes}`

  // 1. Verifica se hoje está aberto e dentro da janela de horários
  if (
    todaySchedule &&
    todaySchedule.isOpen &&
    todaySchedule.open &&
    todaySchedule.close
  ) {
    if (currentTime >= todaySchedule.open && currentTime < todaySchedule.close) {
      return {
        isOpen: true,
        message: 'Aberto agora',
        nextOpening: null,
        todaySchedule,
      }
    }
  }

  // 2. Se não está aberto agora, calcula quando reabre
  let nextOpening: string | null = null

  // 2.1. Se hoje ainda vai abrir mais tarde
  if (
    todaySchedule &&
    todaySchedule.isOpen &&
    todaySchedule.open &&
    currentTime < todaySchedule.open
  ) {
    nextOpening = `Abre às ${todaySchedule.open}`
    return {
      isOpen: false,
      message: `Fechado agora • ${nextOpening}`,
      nextOpening,
      todaySchedule,
    }
  }

  // 2.2. Procurar nos próximos 7 dias
  const dayNamesShort: Record<DayOfWeek, string> = {
    monday: 'segunda',
    tuesday: 'terça',
    wednesday: 'quarta',
    thursday: 'quinta',
    friday: 'sexta',
    saturday: 'sábado',
    sunday: 'domingo',
  }

  for (let offset = 1; offset <= 7; offset++) {
    const nextJsDay = (jsDay + offset) % 7
    const nextKey = JS_DAY_TO_KEY[nextJsDay]
    const sched = businessHours[nextKey]

    if (sched && sched.isOpen && sched.open) {
      if (offset === 1) {
        nextOpening = `Abre amanhã às ${sched.open}`
      } else {
        nextOpening = `Abre ${dayNamesShort[nextKey]} às ${sched.open}`
      }
      break
    }
  }

  return {
    isOpen: false,
    message: nextOpening ? `Fechado agora • ${nextOpening}` : 'Fechado agora',
    nextOpening,
    todaySchedule,
  }
}

/**
 * Extrai a configuração visual da vitrine (tema) a partir da loja,
 * garantindo compatibilidade com store.primary_color e defaults robustos.
 */
export function getStoreTheme(
  store?: Store | Record<string, unknown> | null
): StoreTheme {
  const defaults = { ...DEFAULT_STORE_THEME }
  if (!store) return defaults

  let themeObj: Partial<StoreTheme> = {}

  // 1. Tenta extrair de store.settings.theme
  if ('settings' in store && store.settings && typeof store.settings === 'object') {
    const s = store.settings as Record<string, unknown>
    if (s.theme && typeof s.theme === 'object') {
      const parsed = storeThemeSchema.partial().safeParse(s.theme)
      if (parsed.success) {
        themeObj = parsed.data
      }
    }
  }

  // 2. Tenta extrair de store.theme se estiver direto na raiz
  if ('theme' in store && store.theme && typeof store.theme === 'object') {
    const parsed = storeThemeSchema.partial().safeParse(store.theme)
    if (parsed.success) {
      themeObj = { ...themeObj, ...parsed.data }
    }
  }

  // 3. Fallback de cor primária a partir da coluna nativa stores.primary_color
  const rootPrimary =
    'primary_color' in store && typeof store.primary_color === 'string' && store.primary_color.trim().length > 0
      ? store.primary_color.trim()
      : null

  return {
    primary_color: themeObj.primary_color || rootPrimary || defaults.primary_color,
    secondary_color: themeObj.secondary_color || defaults.secondary_color,
    background_color: themeObj.background_color || defaults.background_color,
    card_color: themeObj.card_color || defaults.card_color,
    text_color: themeObj.text_color || defaults.text_color,
    font_family: themeObj.font_family || defaults.font_family,
    font_weight: themeObj.font_weight || defaults.font_weight,
  }
}

/**
 * Retorna os pesos numéricos CSS e classes de tipografia para o peso selecionado.
 */
export function getFontWeightStyles(weight: FontWeight): {
  bodyWeight: number
  headingWeight: number
  bodyClass: string
  headingClass: string
} {
  switch (weight) {
    case 'light':
      return {
        bodyWeight: 300,
        headingWeight: 500,
        bodyClass: 'font-light',
        headingClass: 'font-medium',
      }
    case 'bold':
      return {
        bodyWeight: 500,
        headingWeight: 800,
        bodyClass: 'font-medium',
        headingClass: 'font-extrabold',
      }
    case 'regular':
    default:
      return {
        bodyWeight: 400,
        headingWeight: 700,
        bodyClass: 'font-normal',
        headingClass: 'font-bold',
      }
  }
}

/**
 * Retorna a cor de texto contrastante ideal (#ffffff ou #171717) para um fundo hexadecimal.
 */
export function getContrastTextColor(hexColor: string): string {
  if (!hexColor) return '#ffffff'
  const cleanHex = hexColor.replace('#', '')
  const fullHex =
    cleanHex.length === 3
      ? cleanHex
          .split('')
          .map((c) => c + c)
          .join('')
      : cleanHex

  if (fullHex.length !== 6) return '#ffffff'

  const r = parseInt(fullHex.substring(0, 2), 16)
  const g = parseInt(fullHex.substring(2, 4), 16)
  const b = parseInt(fullHex.substring(4, 6), 16)

  // Cálculo de luminância perceptual YIQ
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 145 ? '#171717' : '#ffffff'
}
