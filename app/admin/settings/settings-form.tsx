'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  sanitizeSlug,
  DAYS_OF_WEEK,
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
  type DayOfWeek,
  type PixKeyType,
  type Store,
  type LocationType,
  type StorePickupAddress,
  type WhatsAppTemplates,
  getStorePickupAddress,
  formatStorePickupAddressFull,
  getStoreWhatsAppTemplates,
  DEFAULT_WHATSAPP_TEMPLATES,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_SHORT_LABELS,
  getStoreTheme,
  type StoreTheme,
} from '@/lib/domain/stores'
import type { Faq, FaqInput } from '@/lib/domain/faqs'
import { saveStoreSettingsAction } from './actions'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store as StoreIcon,
  QrCode,
  MessageSquare,
  Sparkles,
  Clock,
  HelpCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  MapPin,
  Building2,
  Home,
  Navigation,
  ExternalLink,
  RotateCcw,
  Check,
  Palette,
} from 'lucide-react'

interface SettingsFormProps {
  initialStore?: Store | null
  initialFaqs?: Faq[]
  userEmail?: string
}

type TabType = 'general' | 'pickup' | 'hours' | 'messages' | 'faqs'

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function SettingsForm({
  initialStore,
  initialFaqs = [],
  userEmail,
}: SettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TabType>('general')

  // Estados dos campos do formulário - Templates de WhatsApp
  const initialTemplates = getStoreWhatsAppTemplates(initialStore)
  const [templateReadyDelivery, setTemplateReadyDelivery] = useState(
    initialTemplates.ready_delivery
  )
  const [templateReadyPickup, setTemplateReadyPickup] = useState(
    initialTemplates.ready_pickup
  )
  const [templateStatusUpdate, setTemplateStatusUpdate] = useState(
    initialTemplates.status_update
  )
  const [copiedTag, setCopiedTag] = useState<string | null>(null)

  // Estados dos campos do formulário - Identificação e PIX
  const [name, setName] = useState(initialStore?.name ?? '')
  const [slug, setSlug] = useState(initialStore?.slug ?? '')
  const [whatsappNumber, setWhatsappNumber] = useState(
    initialStore?.whatsapp_number ?? ''
  )
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>(
    (initialStore?.pix_key_type as PixKeyType) ?? 'cpf'
  )
  const [pixKey, setPixKey] = useState(initialStore?.pix_key ?? '')
  const [pixMerchantName, setPixMerchantName] = useState(
    initialStore?.pix_merchant_name ?? ''
  )
  const [pixMerchantCity, setPixMerchantCity] = useState(
    initialStore?.pix_merchant_city ?? ''
  )
  const [description, setDescription] = useState(
    initialStore?.description ?? ''
  )

  // Estados dos campos do formulário - Endereço de Retirada (Brasil)
  const initialPickup = getStorePickupAddress(initialStore)
  const [pickupLocationType, setPickupLocationType] = useState<LocationType>(
    initialPickup?.location_type || 'store'
  )
  const [pickupStreet, setPickupStreet] = useState(initialPickup?.street || '')
  const [pickupNumber, setPickupNumber] = useState(initialPickup?.number || '')
  const [pickupComplement, setPickupComplement] = useState(
    initialPickup?.complement || ''
  )
  const [pickupNeighborhood, setPickupNeighborhood] = useState(
    initialPickup?.neighborhood || ''
  )
  const [pickupCity, setPickupCity] = useState(initialPickup?.city || '')
  const [pickupState, setPickupState] = useState(initialPickup?.state || 'SP')
  const [pickupZipCode, setPickupZipCode] = useState(
    initialPickup?.zip_code || ''
  )
  const [pickupReference, setPickupReference] = useState(
    initialPickup?.reference || ''
  )
  const [pickupInstructions, setPickupInstructions] = useState(
    initialPickup?.instructions || ''
  )
  const [isSearchingCep, setIsSearchingCep] = useState(false)

  // Estados dos campos do formulário - Horário de Funcionamento
  const [businessHours, setBusinessHours] = useState<BusinessHours>(() => {
    if (initialStore?.business_hours && typeof initialStore.business_hours === 'object') {
      const bh = initialStore.business_hours as unknown as BusinessHours
      return {
        monday: bh.monday ?? DEFAULT_BUSINESS_HOURS.monday,
        tuesday: bh.tuesday ?? DEFAULT_BUSINESS_HOURS.tuesday,
        wednesday: bh.wednesday ?? DEFAULT_BUSINESS_HOURS.wednesday,
        thursday: bh.thursday ?? DEFAULT_BUSINESS_HOURS.thursday,
        friday: bh.friday ?? DEFAULT_BUSINESS_HOURS.friday,
        saturday: bh.saturday ?? DEFAULT_BUSINESS_HOURS.saturday,
        sunday: bh.sunday ?? DEFAULT_BUSINESS_HOURS.sunday,
      }
    }
    return DEFAULT_BUSINESS_HOURS
  })

  // Estados dos campos do formulário - FAQs
  const [faqs, setFaqs] = useState<FaqInput[]>(() => {
    if (initialFaqs && initialFaqs.length > 0) {
      return initialFaqs.map((f, i) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        order: f.order ?? i,
      }))
    }
    return []
  })

  // Estados de feedback de validação e salvamento
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Gerar slug automaticamente ao digitar o nome da loja
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setName(newName)
    if (!initialStore && (!slug || slug === sanitizeSlug(name))) {
      setSlug(sanitizeSlug(newName))
    }
  }

  const handleAutoSlug = () => {
    if (name) {
      setSlug(sanitizeSlug(name))
    }
  }

  // Manipulação de Horários de Funcionamento
  const handleToggleDay = (day: DayOfWeek) => {
    setBusinessHours((prev) => {
      const current = prev[day]
      const nextIsOpen = !current.isOpen
      return {
        ...prev,
        [day]: {
          ...current,
          isOpen: nextIsOpen,
          open: nextIsOpen ? current.open || '10:00' : current.open,
          close: nextIsOpen ? current.close || '18:00' : current.close,
        },
      }
    })
  }

  const handleTimeChange = (
    day: DayOfWeek,
    field: 'open' | 'close',
    value: string
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
  }

  const handleCopyMondayToWeekdays = () => {
    const mon = businessHours.monday
    setBusinessHours((prev) => ({
      ...prev,
      tuesday: { ...mon },
      wednesday: { ...mon },
      thursday: { ...mon },
      friday: { ...mon },
    }))
  }

  const handleApplyStandardHours = () => {
    setBusinessHours({
      monday: { isOpen: true, open: '10:00', close: '18:00' },
      tuesday: { isOpen: true, open: '10:00', close: '18:00' },
      wednesday: { isOpen: true, open: '10:00', close: '18:00' },
      thursday: { isOpen: true, open: '10:00', close: '18:00' },
      friday: { isOpen: true, open: '10:00', close: '18:00' },
      saturday: { isOpen: true, open: '10:00', close: '18:00' },
      sunday: { isOpen: false, open: '', close: '' },
    })
  }

  // Manipulação de FAQs
  const handleAddFaq = () => {
    setFaqs((prev) => [
      ...prev,
      {
        question: '',
        answer: '',
        order: prev.length,
      },
    ])
  }

  const handleUpdateFaq = (
    index: number,
    field: 'question' | 'answer',
    value: string
  ) => {
    setFaqs((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value,
      }
      return next
    })
  }

  const handleRemoveFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    setFaqs((prev) => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const temp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = temp
      return next
    })
  }

  const handleZipCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8)
    if (raw.length > 5) {
      setPickupZipCode(`${raw.slice(0, 5)}-${raw.slice(5)}`)
    } else {
      setPickupZipCode(raw)
    }

    if (raw.length === 8) {
      searchCep(raw)
    }
  }

  const searchCep = async (cleanCep: string) => {
    if (cleanCep.length !== 8) return
    setIsSearchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      if (res.ok) {
        const data = await res.json()
        if (!data.erro) {
          if (data.logradouro) setPickupStreet(data.logradouro)
          if (data.bairro) setPickupNeighborhood(data.bairro)
          if (data.localidade) setPickupCity(data.localidade)
          if (data.uf) setPickupState(data.uf.toUpperCase())
        }
      }
    } catch {
      // Ignora erro silencioso
    } finally {
      setIsSearchingCep(false)
    }
  }

  // Submissão Geral
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setStatusMessage(null)

    // Filtra FAQs vazias
    const cleanFaqs = faqs.filter(
      (f) => f.question.trim().length > 0 || f.answer.trim().length > 0
    )

    let pickupAddressPayload: StorePickupAddress | null = null
    if (pickupStreet.trim()) {
      pickupAddressPayload = {
        location_type: pickupLocationType,
        street: pickupStreet.trim(),
        number: pickupNumber.trim() || 'S/N',
        complement: pickupComplement.trim() || null,
        neighborhood: pickupNeighborhood.trim(),
        city: pickupCity.trim(),
        state: pickupState.trim().toUpperCase(),
        zip_code: pickupZipCode.trim() || null,
        reference: pickupReference.trim() || null,
        instructions: pickupInstructions.trim() || null,
      }
    }

    const payload = {
      name,
      slug,
      whatsapp_number: whatsappNumber,
      pix_key_type: pixKeyType,
      pix_key: pixKey || null,
      pix_merchant_name: pixMerchantName || null,
      pix_merchant_city: pixMerchantCity || null,
      primary_color: initialStore?.primary_color || '#000000',
      description: description || null,
      logo_url: initialStore?.logo_url || null,
      banner_url: initialStore?.banner_url || null,
      business_hours: businessHours,
      pickup_address: pickupAddressPayload,
      whatsapp_templates: {
        ready_delivery: templateReadyDelivery,
        ready_pickup: templateReadyPickup,
        status_update: templateStatusUpdate,
      },
      theme: initialStore ? getStoreTheme(initialStore) : undefined,
      faqs: cleanFaqs,
    }

    startTransition(async () => {
      const res = await saveStoreSettingsAction(payload)

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message,
        })
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        })
        if (res.errors) {
          setErrors(res.errors)
        }
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 mx-auto pb-16 max-w-3xl"
    >
      {/* Navegação por Abas Minimalista */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-neutral-200/80 rounded-xl shadow-2xs overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 min-h-[44px] cursor-pointer ${
            activeTab === 'general'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <StoreIcon className="size-4" />
          <span>Identificação & PIX</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pickup')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 min-h-[44px] cursor-pointer ${
            activeTab === 'pickup'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <MapPin className="size-4" />
          <span>Endereço de Retirada</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hours')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 min-h-[44px] ${
            activeTab === 'hours'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <Clock className="size-4" />
          <span>Horários</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 min-h-[44px] ${
            activeTab === 'messages'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <MessageSquare className="size-4" />
          <span>Mensagens WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-1 min-h-[44px] ${
            activeTab === 'faqs'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
          }`}
        >
          <HelpCircle className="size-4" />
          <span>Perguntas Frequentes</span>
          {faqs.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono tabular-nums ${
                activeTab === 'faqs'
                  ? 'bg-neutral-800 text-white'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {faqs.length}
            </span>
          )}
        </button>
      </div>

      {/* Banner de feedback */}
      {statusMessage && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-700" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-rose-700" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: IDENTIFICAÇÃO, CONTATO E PIX */}
      {/* ============================================================== */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Destaque / Redirecionamento amigável para Vitrine */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-neutral-50 to-white border border-neutral-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-900 text-white rounded-lg shrink-0">
                <Palette className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Personalização Visual da Vitrine</p>
                <p className="text-xs text-neutral-500">
                  Cores da marca, logotipo, banner de capa e organização de produtos agora ficam centralizados no módulo <strong>Vitrine</strong>.
                </p>
              </div>
            </div>
            <Link
              href="/admin/storefront"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200 rounded-lg shadow-2xs transition-colors shrink-0"
            >
              <span>Ir para Vitrine</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>

          {/* Card: Informações Gerais da Loja */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-200/80">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                <StoreIcon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-base">Identificação da Loja</h3>
                <p className="text-xs text-neutral-500">
                  Configure o nome, link público e a identidade visual da sua marca.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Nome da Loja */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Loja *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Doçaria Gourmet ou Fornada da Vila"
                  value={name}
                  onChange={handleNameChange}
                  required
                  aria-invalid={!!errors.name}
                  className="bg-white border-neutral-200"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name[0]}</p>
                )}
              </div>

              {/* Slug / Link da Loja */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="slug">Slug da Loja (URL pública) *</Label>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    className="text-xs text-neutral-900 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Sparkles className="size-3" /> Gerar do nome
                  </button>
                </div>
                <div className="flex rounded-lg border border-neutral-200 focus-within:border-neutral-900 focus-within:ring-2 focus-within:ring-neutral-900/10 transition-all overflow-hidden bg-white">
                  <span className="inline-flex items-center px-3 text-xs text-neutral-500 bg-neutral-100 border-r border-neutral-200 select-none font-mono">
                    /
                  </span>
                  <input
                    id="slug"
                    className="flex-1 bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-neutral-400"
                    placeholder="minha-loja"
                    value={slug}
                    onChange={(e) => setSlug(sanitizeSlug(e.target.value))}
                    required
                    aria-invalid={!!errors.slug}
                  />
                </div>
                {errors.slug ? (
                  <p className="text-xs text-destructive">{errors.slug[0]}</p>
                ) : (
                  <p className="text-xs text-neutral-500">
                    Sua vitrine estará disponível em: <span className="font-mono font-medium text-neutral-900">/{slug || 'sua-loja'}</span>
                  </p>
                )}
              </div>


              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição / Bio da Loja</Label>
                <Input
                  id="description"
                  placeholder="Breve descrição da sua marca ou produtos"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-white border-neutral-200"
                />
              </div>


            </div>
          </div>

          {/* Card: Contato & Atendimento */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-200/80">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                <MessageSquare className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-base">Canais de Atendimento</h3>
                <p className="text-xs text-neutral-500">
                  Número de WhatsApp para receber notificações e pedidos dos clientes.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp de Atendimento *</Label>
              <Input
                id="whatsapp"
                placeholder="Ex: 5511999999999 (apenas números com DDD)"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                aria-invalid={!!errors.whatsapp_number}
                className="bg-white border-neutral-200"
              />
              {errors.whatsapp_number ? (
                <p className="text-xs text-destructive">
                  {errors.whatsapp_number[0]}
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  Informe o código do país + DDD + número (ex: 5511999998888).
                </p>
              )}
            </div>
          </div>

          {/* Card: Dados de Pagamento PIX */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-200/80">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                <QrCode className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-base">Configurações de Pagamento PIX</h3>
                <p className="text-xs text-neutral-500">
                  Configure sua chave PIX para que os clientes realizem o pagamento no checkout com QR Code e Copia e Cola.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Tipo de Chave PIX */}
              <div className="space-y-2">
                <Label htmlFor="pixKeyType">Tipo de Chave PIX</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'cpf', label: 'CPF / CNPJ' },
                      { id: 'phone', label: 'Telefone' },
                      { id: 'email', label: 'E-mail' },
                      { id: 'random', label: 'Aleatória' },
                    ] as const
                  ).map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setPixKeyType(type.id as PixKeyType)}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border min-h-[44px] transition-all ${
                        pixKeyType === type.id
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chave PIX */}
              <div className="space-y-2">
                <Label htmlFor="pixKey">Chave PIX</Label>
                <Input
                  id="pixKey"
                  placeholder={
                    pixKeyType === 'cpf'
                      ? 'Ex: 123.456.789-00 ou 12.345.678/0001-90'
                      : pixKeyType === 'email'
                      ? 'Ex: pagamento@sualoja.com'
                      : pixKeyType === 'phone'
                      ? 'Ex: +5511999998888'
                      : 'Ex: 123e4567-e89b-12d3-a456-426614174000'
                  }
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  aria-invalid={!!errors.pix_key}
                  className="bg-white border-neutral-200"
                />
                {errors.pix_key && (
                  <p className="text-xs text-destructive">{errors.pix_key[0]}</p>
                )}
              </div>

              {/* Dados do Titular do PIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pixMerchantName">Nome do Titular da Conta</Label>
                  <Input
                    id="pixMerchantName"
                    placeholder="Ex: João da Silva"
                    value={pixMerchantName}
                    onChange={(e) => setPixMerchantName(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Nome completo ou Razão Social que aparece no comprovante.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pixMerchantCity">Cidade do Titular</Label>
                  <Input
                    id="pixMerchantCity"
                    placeholder="Ex: Sao Paulo"
                    value={pixMerchantCity}
                    onChange={(e) => setPixMerchantCity(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Cidade da agência bancária (sem acentos recomendados).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: ENDEREÇO DE RETIRADA NO LOCAL (BRASIL) */}
      {/* ============================================================== */}
      {activeTab === 'pickup' && (
        <div className="space-y-6">
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-neutral-200/80">
              <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                <MapPin className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900 text-base">
                  Endereço para Retirada no Local
                </h3>
                <p className="text-xs text-neutral-500">
                  Configure o endereço físico onde seus clientes devem retirar pedidos agendados ou de pronta-entrega.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* 1. Tipo de Local */}
              <div className="space-y-2">
                <Label>Tipo de Local</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {
                        id: 'store',
                        label: 'Loja comercial / Ponto Físico',
                        icon: StoreIcon,
                        desc: 'Com balcão ou fachada',
                      },
                      {
                        id: 'house',
                        label: 'Casa / Residência',
                        icon: Home,
                        desc: 'Ateliê ou casa particular',
                      },
                      {
                        id: 'condo',
                        label: 'Condomínio / Edifício',
                        icon: Building2,
                        desc: 'Prédio ou sala comercial',
                      },
                    ] as const
                  ).map((t) => {
                    const Icon = t.icon
                    const isSelected = pickupLocationType === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setPickupLocationType(t.id as LocationType)}
                        className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1 min-h-[56px] ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-medium text-xs">
                          <Icon className="size-4 shrink-0" />
                          <span>{t.label}</span>
                        </div>
                        <span
                          className={`text-[11px] ${
                            isSelected ? 'text-neutral-300' : 'text-neutral-500'
                          }`}
                        >
                          {t.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. CEP */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="pickupZipCode">CEP (Brasil)</Label>
                  {isSearchingCep && (
                    <span className="text-xs text-sky-600 flex items-center gap-1 font-medium">
                      <Loader2 className="size-3 animate-spin" /> Buscando endereço...
                    </span>
                  )}
                </div>
                <Input
                  id="pickupZipCode"
                  placeholder="00000-000"
                  value={pickupZipCode}
                  onChange={handleZipCodeChange}
                  maxLength={9}
                  className="font-mono max-w-[200px] bg-white border-neutral-200"
                />
                <p className="text-xs text-neutral-500">
                  Preencha o CEP para autocompletar rua, bairro, cidade e estado.
                </p>
              </div>

              {/* 3. Logradouro / Rua e Número */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="pickupStreet">Rua / Logradouro</Label>
                  <Input
                    id="pickupStreet"
                    placeholder="Ex: Rua das Palmeiras, Av. Brasil"
                    value={pickupStreet}
                    onChange={(e) => setPickupStreet(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupNumber">Número</Label>
                  <Input
                    id="pickupNumber"
                    placeholder="Ex: 123 ou S/N"
                    value={pickupNumber}
                    onChange={(e) => setPickupNumber(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                </div>
              </div>

              {/* 4. Complemento e Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickupComplement">Complemento (Opcional)</Label>
                  <Input
                    id="pickupComplement"
                    placeholder="Ex: Apto 42, Bloco B, Sala 10"
                    value={pickupComplement}
                    onChange={(e) => setPickupComplement(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupNeighborhood">Bairro</Label>
                  <Input
                    id="pickupNeighborhood"
                    placeholder="Ex: Jardim América, Centro"
                    value={pickupNeighborhood}
                    onChange={(e) => setPickupNeighborhood(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                </div>
              </div>

              {/* 5. Cidade e Estado (UF) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="pickupCity">Cidade</Label>
                  <Input
                    id="pickupCity"
                    placeholder="Ex: São Paulo, Curitiba"
                    value={pickupCity}
                    onChange={(e) => setPickupCity(e.target.value)}
                    className="bg-white border-neutral-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pickupState">Estado (UF)</Label>
                  <select
                    id="pickupState"
                    value={pickupState}
                    onChange={(e) => setPickupState(e.target.value)}
                    className="w-full bg-white border border-neutral-200 rounded-lg h-9 px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[36px]"
                  >
                    {UF_LIST.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 6. Ponto de Referência */}
              <div className="space-y-2">
                <Label htmlFor="pickupReference">Ponto de Referência (Opcional)</Label>
                <Input
                  id="pickupReference"
                  placeholder="Ex: Em frente à Praça da Matriz, portão azul ao lado da padaria"
                  value={pickupReference}
                  onChange={(e) => setPickupReference(e.target.value)}
                  className="bg-white border-neutral-200"
                />
                <p className="text-xs text-neutral-500">
                  Facilita para o cliente identificar o local correto da retirada.
                </p>
              </div>

              {/* 7. Instruções de Retirada */}
              <div className="space-y-2">
                <Label htmlFor="pickupInstructions">
                  Instruções para o Cliente na Retirada (Opcional)
                </Label>
                <textarea
                  id="pickupInstructions"
                  rows={3}
                  placeholder="Ex: Tocar o interfone 42 ou avisar na portaria que veio retirar encomenda de doces. Aguardar no balcão."
                  value={pickupInstructions}
                  onChange={(e) => setPickupInstructions(e.target.value)}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-y"
                />
                <p className="text-xs text-neutral-500">
                  Instruções práticas enviadas ao cliente via WhatsApp e mostradas na confirmação do pedido.
                </p>
              </div>

              {/* 8. Live Preview Card */}
              {pickupStreet && (
                <div className="mt-6 p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                    <Navigation className="size-4 text-neutral-700" />
                    <span>Visualização do Endereço de Retirada na Vitrine & WhatsApp</span>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-neutral-200/80 text-xs text-neutral-800 space-y-1.5 font-sans leading-relaxed">
                    <p className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      📍 Endereço de Retirada:
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {LOCATION_TYPE_LABELS[pickupLocationType]}
                      </span>
                    </p>
                    <p className="text-neutral-700">
                      {formatStorePickupAddressFull({
                        location_type: pickupLocationType,
                        street: pickupStreet,
                        number: pickupNumber || 'S/N',
                        complement: pickupComplement || null,
                        neighborhood: pickupNeighborhood,
                        city: pickupCity,
                        state: pickupState,
                        zip_code: pickupZipCode || null,
                        reference: pickupReference || null,
                        instructions: pickupInstructions || null,
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: HORÁRIO DE FUNCIONAMENTO */}
      {/* ============================================================== */}
      {activeTab === 'hours' && (
        <div className="space-y-6">
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base">Horário de Funcionamento</h3>
                  <p className="text-xs text-neutral-500">
                    Defina os dias e janelas de horário em que a sua pronta-entrega estará disponível.
                  </p>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyMondayToWeekdays}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors min-h-[36px]"
                  title="Aplica o horário de Segunda para Terça, Quarta, Quinta e Sexta"
                >
                  <Copy className="size-3" />
                  Copiar Seg para Seg-Sex
                </button>
                <button
                  type="button"
                  onClick={handleApplyStandardHours}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors min-h-[36px]"
                  title="Define Seg-Sáb das 10:00 às 18:00 e Domingo fechado"
                >
                  <Sparkles className="size-3" />
                  Padrão Comercial
                </button>
              </div>
            </div>

            {/* Lista dos 7 Dias da Semana */}
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const dayConfig = businessHours[key]
                const isOpen = dayConfig?.isOpen ?? false

                return (
                  <div
                    key={key}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      isOpen
                        ? 'border-neutral-200/80 bg-white shadow-2xs'
                        : 'border-neutral-200/50 bg-neutral-50/70 opacity-80'
                    }`}
                  >
                    {/* Dia + Toggle Aberto/Fechado */}
                    <div className="flex items-center justify-between sm:justify-start gap-3 min-w-[200px]">
                      <span className="font-semibold text-sm text-neutral-900 w-32">
                        {label}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleDay(key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[40px] border ${
                          isOpen
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-neutral-100 text-neutral-500 border-neutral-200 hover:bg-neutral-200'
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-neutral-400'
                          }`}
                        />
                        {isOpen ? 'Aberto' : 'Fechado'}
                      </button>
                    </div>

                    {/* Campos de Horário: Abertura e Fechamento */}
                    {isOpen ? (
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-neutral-500 font-medium">De:</span>
                          <input
                            type="time"
                            value={dayConfig.open || '10:00'}
                            onChange={(e) =>
                              handleTimeChange(key, 'open', e.target.value)
                            }
                            className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[40px]"
                          />
                        </div>

                        <span className="text-neutral-400 text-xs">até</span>

                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-neutral-500 font-medium">Às:</span>
                          <input
                            type="time"
                            value={dayConfig.close || '18:00'}
                            onChange={(e) =>
                              handleTimeChange(key, 'close', e.target.value)
                            }
                            className="bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 min-h-[40px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-400 italic py-1 sm:py-0">
                        Não haverá atendimento de pronta-entrega neste dia.
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 text-xs text-neutral-600 space-y-1">
              <p className="font-semibold text-neutral-900">
                ⚡ Regra de Pronta-Entrega vs 📅 Encomendas:
              </p>
              <p>
                Quando a loja estiver fora do horário de funcionamento, os itens de <strong>Pronta-Entrega</strong> serão pausados na vitrine pública.
                Pedidos sob <strong>Encomenda</strong> continuarão liberados 24h para os clientes agendarem a data de entrega.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 4: MENSAGENS DO WHATSAPP (TEMPLATES CUSTOMIZÁVEIS) */}
      {/* ============================================================== */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          {/* Card 1: Pedido Pronto - Delivery */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
                    <span>🛵 Pedido Pronto — Envio por Delivery</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enviada ao cliente na esteira de produção para combinar a entrega (ex: Uber Flash).
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTemplateReadyDelivery(DEFAULT_WHATSAPP_TEMPLATES.ready_delivery)
                }
                className="text-xs text-neutral-600 hover:text-neutral-900 border-neutral-200 shrink-0"
                title="Voltar para a mensagem original de fábrica"
              >
                <RotateCcw className="size-3.5 mr-1.5 text-neutral-500" />
                Restaurar Padrão
              </Button>
            </div>

            {/* Tags dinâmicas disponíveis */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-600 font-medium">
                Variáveis disponíveis (clique para adicionar ao texto):
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { tag: '{cliente}', desc: 'Nome do cliente' },
                  { tag: '{pedido}', desc: 'Nº do pedido' },
                  { tag: '{loja}', desc: 'Nome da loja' },
                  { tag: '{endereco}', desc: 'Endereço de entrega' },
                  { tag: '{total}', desc: 'Valor total' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => {
                      setTemplateReadyDelivery((prev) => `${prev} ${item.tag}`)
                      setCopiedTag(item.tag)
                      setTimeout(() => setCopiedTag(null), 2000)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-100 text-neutral-800 hover:bg-neutral-200/80 border border-neutral-200 transition-colors"
                  >
                    <span>{item.tag}</span>
                    <span className="text-[10px] text-neutral-500 font-sans">({item.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de texto do template */}
            <div className="space-y-1.5">
              <Label htmlFor="templateReadyDelivery" className="text-xs font-semibold text-neutral-900">
                Texto da Mensagem *
              </Label>
              <textarea
                id="templateReadyDelivery"
                rows={6}
                value={templateReadyDelivery}
                onChange={(e) => setTemplateReadyDelivery(e.target.value)}
                className="w-full bg-neutral-50/50 border border-neutral-200 rounded-xl p-3.5 text-xs sm:text-sm font-sans text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all resize-y"
                placeholder="Escreva a mensagem personalizada..."
              />
            </div>

            {/* Preview do WhatsApp */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-600" />
                Pré-visualização como o cliente receberá no WhatsApp:
              </Label>
              <div className="p-4 rounded-xl bg-neutral-100/70 border border-neutral-200/70">
                <div className="max-w-md bg-[#d9fdd3] text-neutral-900 p-3.5 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-xs whitespace-pre-line border border-[#c4e6be]/60">
                  {templateReadyDelivery
                    .replace(/{cliente}/g, 'Maria Silva')
                    .replace(/{loja}/g, name || 'Sua Loja')
                    .replace(/{pedido}/g, '1042')
                    .replace(/{endereco}/g, 'Rua das Flores, 123 - Jardim Primavera')
                    .replace(/{total}/g, 'R$ 68,00')}
                  <div className="text-[10px] text-neutral-500 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                    <span>14:32</span>
                    <span className="text-sky-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Pedido Pronto - Retirada no Balcão */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
                    <span>🛍️ Pedido Pronto — Retirada no Balcão</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Enviada ao cliente avisando que a encomenda está pronta para retirada na loja física.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTemplateReadyPickup(DEFAULT_WHATSAPP_TEMPLATES.ready_pickup)
                }
                className="text-xs text-neutral-600 hover:text-neutral-900 border-neutral-200 shrink-0"
                title="Voltar para a mensagem original de fábrica"
              >
                <RotateCcw className="size-3.5 mr-1.5 text-neutral-500" />
                Restaurar Padrão
              </Button>
            </div>

            {/* Tags dinâmicas disponíveis */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-600 font-medium">
                Variáveis disponíveis (clique para adicionar ao texto):
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { tag: '{cliente}', desc: 'Nome do cliente' },
                  { tag: '{pedido}', desc: 'Nº do pedido' },
                  { tag: '{loja}', desc: 'Nome da loja' },
                  { tag: '{endereco_retirada}', desc: 'Endereço da loja' },
                  { tag: '{total}', desc: 'Valor total' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => {
                      setTemplateReadyPickup((prev) => `${prev} ${item.tag}`)
                      setCopiedTag(item.tag)
                      setTimeout(() => setCopiedTag(null), 2000)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-100 text-neutral-800 hover:bg-neutral-200/80 border border-neutral-200 transition-colors"
                  >
                    <span>{item.tag}</span>
                    <span className="text-[10px] text-neutral-500 font-sans">({item.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de texto do template */}
            <div className="space-y-1.5">
              <Label htmlFor="templateReadyPickup" className="text-xs font-semibold text-neutral-900">
                Texto da Mensagem *
              </Label>
              <textarea
                id="templateReadyPickup"
                rows={6}
                value={templateReadyPickup}
                onChange={(e) => setTemplateReadyPickup(e.target.value)}
                className="w-full bg-neutral-50/50 border border-neutral-200 rounded-xl p-3.5 text-xs sm:text-sm font-sans text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all resize-y"
                placeholder="Escreva a mensagem personalizada..."
              />
            </div>

            {/* Preview do WhatsApp */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-600" />
                Pré-visualização como o cliente receberá no WhatsApp:
              </Label>
              <div className="p-4 rounded-xl bg-neutral-100/70 border border-neutral-200/70">
                <div className="max-w-md bg-[#d9fdd3] text-neutral-900 p-3.5 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-xs whitespace-pre-line border border-[#c4e6be]/60">
                  {templateReadyPickup
                    .replace(/{cliente}/g, 'Maria Silva')
                    .replace(/{loja}/g, name || 'Sua Loja')
                    .replace(/{pedido}/g, '1042')
                    .replace(
                      /{endereco_retirada}/g,
                      pickupStreet
                        ? `${pickupStreet}, ${pickupNumber || 'S/N'}${pickupNeighborhood ? ` - ${pickupNeighborhood}` : ''}, ${pickupCity || 'São Paulo'}`
                        : 'Rua Principal, 500 - Centro'
                    )
                    .replace(
                      /{endereco}/g,
                      pickupStreet
                        ? `${pickupStreet}, ${pickupNumber || 'S/N'}${pickupNeighborhood ? ` - ${pickupNeighborhood}` : ''}, ${pickupCity || 'São Paulo'}`
                        : 'Rua Principal, 500 - Centro'
                    )
                    .replace(/{total}/g, 'R$ 68,00')}
                  <div className="text-[10px] text-neutral-500 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                    <span>14:32</span>
                    <span className="text-sky-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Atualização Geral de Status */}
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-50 text-sky-800 border border-sky-200">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base flex items-center gap-2">
                    <span>📌 Atualização Geral de Status</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Utilizada no botão de contato geral dos cards de pedidos e listagem do painel.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTemplateStatusUpdate(DEFAULT_WHATSAPP_TEMPLATES.status_update)
                }
                className="text-xs text-neutral-600 hover:text-neutral-900 border-neutral-200 shrink-0"
                title="Voltar para a mensagem original de fábrica"
              >
                <RotateCcw className="size-3.5 mr-1.5 text-neutral-500" />
                Restaurar Padrão
              </Button>
            </div>

            {/* Tags dinâmicas disponíveis */}
            <div className="space-y-1.5">
              <Label className="text-xs text-neutral-600 font-medium">
                Variáveis disponíveis (clique para adicionar ao texto):
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { tag: '{cliente}', desc: 'Nome do cliente' },
                  { tag: '{pedido}', desc: 'Nº do pedido' },
                  { tag: '{loja}', desc: 'Nome da loja' },
                  { tag: '{status}', desc: 'Status atual' },
                  { tag: '{total}', desc: 'Valor total' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => {
                      setTemplateStatusUpdate((prev) => `${prev} ${item.tag}`)
                      setCopiedTag(item.tag)
                      setTimeout(() => setCopiedTag(null), 2000)
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-neutral-100 text-neutral-800 hover:bg-neutral-200/80 border border-neutral-200 transition-colors"
                  >
                    <span>{item.tag}</span>
                    <span className="text-[10px] text-neutral-500 font-sans">({item.desc})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campo de texto do template */}
            <div className="space-y-1.5">
              <Label htmlFor="templateStatusUpdate" className="text-xs font-semibold text-neutral-900">
                Texto da Mensagem *
              </Label>
              <textarea
                id="templateStatusUpdate"
                rows={6}
                value={templateStatusUpdate}
                onChange={(e) => setTemplateStatusUpdate(e.target.value)}
                className="w-full bg-neutral-50/50 border border-neutral-200 rounded-xl p-3.5 text-xs sm:text-sm font-sans text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:bg-white transition-all resize-y"
                placeholder="Escreva a mensagem personalizada..."
              />
            </div>

            {/* Preview do WhatsApp */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                <Sparkles className="size-3 text-emerald-600" />
                Pré-visualização como o cliente receberá no WhatsApp:
              </Label>
              <div className="p-4 rounded-xl bg-neutral-100/70 border border-neutral-200/70">
                <div className="max-w-md bg-[#d9fdd3] text-neutral-900 p-3.5 rounded-2xl rounded-tl-sm text-xs sm:text-sm shadow-xs whitespace-pre-line border border-[#c4e6be]/60">
                  {templateStatusUpdate
                    .replace(/{cliente}/g, 'Maria Silva')
                    .replace(/{loja}/g, name || 'Sua Loja')
                    .replace(/{pedido}/g, '1042')
                    .replace(/{status}/g, 'Em Preparo')
                    .replace(/{total}/g, 'R$ 68,00')}
                  <div className="text-[10px] text-neutral-500 text-right mt-1.5 flex items-center justify-end gap-1 font-mono">
                    <span>14:32</span>
                    <span className="text-sky-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 5: PERGUNTAS FREQUENTES (FAQ) */}
      {/* ============================================================== */}
      {activeTab === 'faqs' && (
        <div className="space-y-6">
          <div className="border border-neutral-200/80 rounded-xl shadow-2xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-neutral-100 text-neutral-800">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 text-base">Perguntas Frequentes (FAQ)</h3>
                  <p className="text-xs text-neutral-500">
                    Cadastre respostas para dúvidas comuns sobre pedidos, prazos, entregas e pagamentos.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleAddFaq}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium gap-1.5 h-10 min-h-[40px]"
              >
                <Plus className="size-3.5" />
                Adicionar Pergunta
              </Button>
            </div>

            {/* Lista de FAQs */}
            {faqs.length === 0 ? (
              <div className="p-8 text-center bg-neutral-50 border border-dashed border-neutral-200 rounded-xl space-y-3">
                <div className="size-10 rounded-xl bg-white border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
                  <HelpCircle className="size-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-xs text-neutral-900">
                    Nenhuma pergunta frequente cadastrada
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto">
                    Adicione perguntas como prazos de entrega, formas de pagamento ou políticas de cancelamento para orientar seus clientes na vitrine.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleAddFaq}
                  variant="outline"
                  className="text-xs h-9 min-h-[40px] border-neutral-200"
                >
                  <Plus className="size-3 mr-1" /> Criar Primeira Pergunta
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-xl border border-neutral-200/80 bg-white shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-semibold text-neutral-700">
                          Pergunta & Resposta
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Botão Subir Ordem */}
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveFaq(index, 'up')}
                          className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Subir ordem"
                        >
                          <ChevronUp className="size-4" />
                        </button>

                        {/* Botão Descer Ordem */}
                        <button
                          type="button"
                          disabled={index === faqs.length - 1}
                          onClick={() => handleMoveFaq(index, 'down')}
                          className="size-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Descer ordem"
                        >
                          <ChevronDown className="size-4" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          type="button"
                          onClick={() => handleRemoveFaq(index)}
                          className="size-8 rounded-lg flex items-center justify-center text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors ml-1"
                          title="Remover pergunta"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-neutral-700">
                          Pergunta *
                        </Label>
                        <Input
                          placeholder="Ex: Como funciona a entrega e retirada?"
                          value={faq.question}
                          onChange={(e) =>
                            handleUpdateFaq(index, 'question', e.target.value)
                          }
                          required
                          className="bg-white border-neutral-200 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-neutral-700">
                          Resposta *
                        </Label>
                        <textarea
                          rows={3}
                          placeholder="Ex: Realizamos entregas via motoboy das 10h às 18h de segunda a sábado. Retiradas devem ser combinadas previamente pelo WhatsApp."
                          value={faq.answer}
                          onChange={(e) =>
                            handleUpdateFaq(index, 'answer', e.target.value)
                          }
                          required
                          className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 resize-y"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rodapé Fixo / Ação de Salvar Global */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-neutral-200/80 bg-neutral-50">
        <p className="text-xs text-neutral-500">
          {userEmail ? `Logado como: ${userEmail}` : 'Alterações salvas instantaneamente'}
        </p>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium min-h-[44px] px-6 text-sm rounded-lg shadow-xs"
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin mr-1.5" />
              Salvando alterações...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </form>
  )
}
