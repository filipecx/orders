'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  formatDropStatus,
  calculateDropStockSummary,
  type DropStatus,
  type DropWithItems,
  type DropFormInput,
  type DropItemInput,
} from '@/lib/domain/drops'
import { sanitizeSlug } from '@/lib/domain/stores'
import { formatCurrency, type Product } from '@/lib/domain/products'
import {
  saveDropAction,
  updateDropStatusAction,
  deleteDropAction,
} from './actions'
import {
  Plus,
  Sparkles,
  Calendar,
  Clock,
  Package,
  Layers,
  Trash2,
  Edit2,
  Play,
  Pause,
  StopCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Flame,
} from 'lucide-react'

interface DropsClientProps {
  initialDrops: DropWithItems[]
  availableProducts: Product[]
}

const emptyDropForm: DropFormInput = {
  title: '',
  slug: '',
  description: '',
  banner_url: '',
  status: 'scheduled',
  starts_at: '',
  ends_at: '',
  max_orders: null,
  is_active: true,
  items: [],
}

export function DropsClient({
  initialDrops,
  availableProducts,
}: DropsClientProps) {
  const [drops, setDrops] = useState<DropWithItems[]>(initialDrops)
  const [isPending, startTransition] = useTransition()

  // Modal de Criação / Edição
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDrop, setEditingDrop] = useState<DropFormInput>(emptyDropForm)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleOpenCreate = () => {
    // Definir data padrão de início (agora) e fim (+24h)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const startsAtIso = now.toISOString().slice(0, 16)
    const endsAtIso = tomorrow.toISOString().slice(0, 16)

    setEditingDrop({
      ...emptyDropForm,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      items: [],
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (drop: DropWithItems) => {
    const itemsFormatted: DropItemInput[] = drop.items.map((item) => ({
      id: item.id,
      product_id: item.product_id,
      allocated_quantity: item.allocated_quantity,
      custom_price: item.custom_price,
      promotional_price: item.promotional_price,
      max_per_order: item.max_per_order,
      is_active: item.is_active ?? true,
    }))

    setEditingDrop({
      id: drop.id,
      title: drop.title,
      slug: drop.slug,
      description: drop.description ?? '',
      banner_url: drop.banner_url ?? '',
      status: drop.status,
      starts_at: drop.starts_at ? new Date(drop.starts_at).toISOString().slice(0, 16) : '',
      ends_at: drop.ends_at ? new Date(drop.ends_at).toISOString().slice(0, 16) : '',
      max_orders: drop.max_orders,
      is_active: drop.is_active ?? true,
      items: itemsFormatted,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setEditingDrop((prev) => ({
      ...prev,
      title: newTitle,
      slug: !prev.id && (!prev.slug || prev.slug === sanitizeSlug(prev.title))
        ? sanitizeSlug(newTitle)
        : prev.slug,
    }))
  }

  // Adicionar produto ao drop
  const handleToggleProductInDrop = (product: Product) => {
    setEditingDrop((prev) => {
      const exists = prev.items.some((item) => item.product_id === product.id)
      if (exists) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.product_id !== product.id),
        }
      } else {
        const newItem: DropItemInput = {
          product_id: product.id,
          allocated_quantity: product.stock_quantity && product.stock_quantity > 0 ? product.stock_quantity : 10,
          custom_price: product.price,
          promotional_price: product.promotional_price,
          max_per_order: null,
          is_active: true,
        }
        return {
          ...prev,
          items: [...prev.items, newItem],
        }
      }
    })
  }

  // Atualizar estoque ou preço do item do drop
  const handleUpdateDropItem = (
    productId: string,
    field: keyof DropItemInput,
    value: unknown
  ) => {
    setEditingDrop((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.product_id === productId ? { ...item, [field]: value } : item
      ),
    }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})
    setFeedback(null)

    startTransition(async () => {
      const res = await saveDropAction(editingDrop)

      if (res.success && res.data) {
        setFeedback({ type: 'success', text: res.message })
        setIsDialogOpen(false)

        const saved = res.data as DropWithItems
        setDrops((prev) => {
          const index = prev.findIndex((d) => d.id === saved.id)
          if (index >= 0) {
            const next = [...prev]
            next[index] = saved
            return next
          }
          return [saved, ...prev]
        })
      } else {
        setFeedback({ type: 'error', text: res.message })
        if (res.errors) {
          setFormErrors(res.errors)
        }
      }
    })
  }

  const handleStatusChange = (dropId: string, newStatus: DropStatus) => {
    startTransition(async () => {
      const res = await updateDropStatusAction(dropId, newStatus)
      if (res.success) {
        setDrops((prev) =>
          prev.map((d) => (d.id === dropId ? { ...d, status: newStatus } : d))
        )
        setFeedback({ type: 'success', text: res.message })
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const handleDelete = (dropId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pré-venda?')) return

    startTransition(async () => {
      const res = await deleteDropAction(dropId)
      if (res.success) {
        setDrops((prev) => prev.filter((d) => d.id !== dropId))
        setFeedback({ type: 'success', text: res.message })
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const formatDateLabel = (isoDate: string | null) => {
    if (!isoDate) return 'Não definida'
    return new Date(isoDate).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-destructive/10 text-destructive border-destructive/20'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            Pré-vendas e Fornadas Limitadas
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure campanhas com estoque exclusivo, contagem regressiva e pedidos sob demanda.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="size-4 mr-1.5" />
          Agendar Nova Pré-venda
        </Button>
      </div>

      {/* Lista de Pré-vendas */}
      {drops.length === 0 ? (
        <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white p-16 text-center space-y-3">
          <div className="size-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-700">
            <Sparkles className="size-6" />
          </div>
          <h3 className="font-semibold text-neutral-900">
            Nenhuma Pré-venda agendada ainda
          </h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            Crie sua primeira pré-venda, selecione os produtos participantes e defina o estoque reservado para começar a vender.
          </p>
          <Button onClick={handleOpenCreate} className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium" size="sm">
            <Plus className="size-3.5 mr-1" />
            Criar Primeira Pré-venda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drops.map((drop) => {
            const statusConfig = formatDropStatus(drop.status, drop.ends_at)
            const stockSummary = calculateDropStockSummary(drop.items)

            return (
              <div key={drop.id} className="overflow-hidden border border-neutral-200/80 rounded-xl shadow-xs bg-white flex flex-col justify-between">
                {/* Banner ou Header */}
                <div className="relative h-32 w-full bg-neutral-100 overflow-hidden">
                  {drop.banner_url ? (
                    <Image
                      src={drop.banner_url}
                      alt={drop.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-600">
                      <Flame className="size-10" />
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConfig.colorClass}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                {/* Conteúdo */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-900">{drop.title}</h3>
                      <span className="font-mono text-xs text-neutral-500 mt-0.5 block">
                        /prevenda/{drop.slug}
                      </span>
                    </div>
                  </div>
                  {drop.description && (
                    <p className="text-xs text-neutral-500 line-clamp-2 mt-1">
                      {drop.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4 px-5 pt-0">
                  {/* Período */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-neutral-50/60 p-2.5 rounded-lg border border-neutral-200/80">
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <Calendar className="size-3.5 text-neutral-700" />
                      <div>
                        <span className="text-[10px] block font-medium uppercase tracking-wider text-neutral-400">
                          Início
                        </span>
                        <span className="text-neutral-800 font-medium">
                          {formatDateLabel(drop.starts_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500">
                      <Clock className="size-3.5 text-neutral-700" />
                      <div>
                        <span className="text-[10px] block font-medium uppercase tracking-wider text-neutral-400">
                          Encerramento
                        </span>
                        <span className="text-neutral-800 font-medium">
                          {formatDateLabel(drop.ends_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Estoque da Pré-venda */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Layers className="size-3.5" />
                        Estoque Alocado: {stockSummary.totalAllocated} un
                      </span>
                      <span className="text-neutral-900 tabular-nums">
                        {stockSummary.totalSold} vendidos ({stockSummary.percentSold}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden">
                      <div
                        className="h-full bg-neutral-900 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.min(100, stockSummary.percentSold)}%` }}
                      />
                    </div>
                  </div>

                  {/* Produtos participantes */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                      <Package className="size-3" />
                      {drop.items.length} {drop.items.length === 1 ? 'produto vinculado' : 'produtos vinculados'}:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {drop.items.map((item) => (
                        <span key={item.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700">
                          {item.product?.name ?? 'Produto'} ({item.allocated_quantity} un)
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer de Ações Rápidas */}
                <div className="px-5 py-3 mt-4 bg-neutral-50/50 border-t border-neutral-200/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {drop.status === 'scheduled' || drop.status === 'draft' || drop.status === 'paused' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(drop.id, 'active')}
                        disabled={isPending}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-xs"
                      >
                        <Play className="size-3 mr-1" /> Ativar
                      </button>
                    ) : drop.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(drop.id, 'paused')}
                        disabled={isPending}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200 transition-colors"
                      >
                        <Pause className="size-3 mr-1" /> Pausar
                      </button>
                    ) : null}

                    {drop.status !== 'ended' && drop.status !== 'sold_out' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(drop.id, 'ended')}
                        disabled={isPending}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-lg bg-white text-neutral-600 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                      >
                        <StopCircle className="size-3 mr-1" /> Encerrar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() => handleOpenEdit(drop)}
                      className="size-8 rounded-lg inline-flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Excluir"
                      onClick={() => handleDelete(drop.id)}
                      className="size-8 rounded-lg inline-flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dialog para Criar / Agendar Pré-venda */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingDrop.id ? 'Editar Pré-venda' : 'Agendar Nova Pré-venda'}
            </DialogTitle>
            <DialogDescription>
              Defina as datas, status e o estoque exclusivo dos produtos para este evento.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Título & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dropTitle">Título da Pré-venda *</Label>
                <Input
                  id="dropTitle"
                  placeholder="Ex: Fornada de Pães Artesanais #01"
                  value={editingDrop.title}
                  onChange={handleTitleChange}
                  required
                  aria-invalid={!!formErrors.title}
                />
                {formErrors.title && (
                  <p className="text-xs text-destructive">{formErrors.title[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dropSlug">Slug da URL *</Label>
                <div className="flex rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 overflow-hidden bg-background">
                  <span className="inline-flex items-center px-2.5 text-xs text-muted-foreground bg-muted/60 border-r border-input select-none">
                    /prevenda/
                  </span>
                  <input
                    id="dropSlug"
                    className="flex-1 bg-transparent px-2.5 py-1 text-sm outline-none placeholder:text-muted-foreground"
                    placeholder="fornada-artesanal"
                    value={editingDrop.slug}
                    onChange={(e) =>
                      setEditingDrop({
                        ...editingDrop,
                        slug: sanitizeSlug(e.target.value),
                      })
                    }
                    required
                    aria-invalid={!!formErrors.slug}
                  />
                </div>
                {formErrors.slug && (
                  <p className="text-xs text-destructive">{formErrors.slug[0]}</p>
                )}
              </div>
            </div>

            {/* Descrição & Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dropDesc">Descrição</Label>
                <Input
                  id="dropDesc"
                  placeholder="Apenas 30 unidades para entrega no sábado..."
                  value={editingDrop.description ?? ''}
                  onChange={(e) =>
                    setEditingDrop({
                      ...editingDrop,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dropBanner">URL do Banner</Label>
                <Input
                  id="dropBanner"
                  placeholder="https://exemplo.com/banner.jpg"
                  value={editingDrop.banner_url ?? ''}
                  onChange={(e) =>
                    setEditingDrop({
                      ...editingDrop,
                      banner_url: e.target.value,
                    })
                  }
                  aria-invalid={!!formErrors.banner_url}
                />
              </div>
            </div>

            {/* Datas e Horários & Status Inicial */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Data/Hora Início</Label>
                <Input
                  id="startsAt"
                  type="datetime-local"
                  value={editingDrop.starts_at ?? ''}
                  onChange={(e) =>
                    setEditingDrop({
                      ...editingDrop,
                      starts_at: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endsAt">Data/Hora Fim</Label>
                <Input
                  id="endsAt"
                  type="datetime-local"
                  value={editingDrop.ends_at ?? ''}
                  onChange={(e) =>
                    setEditingDrop({
                      ...editingDrop,
                      ends_at: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dropStatus">Status Inicial</Label>
                <select
                  id="dropStatus"
                  value={editingDrop.status}
                  onChange={(e) =>
                    setEditingDrop({
                      ...editingDrop,
                      status: e.target.value as DropStatus,
                    })
                  }
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <option value="draft">Rascunho</option>
                  <option value="scheduled">Agendada</option>
                  <option value="active">Ao Vivo (Ativa)</option>
                  <option value="paused">Pausada</option>
                  <option value="ended">Encerrada</option>
                </select>
              </div>
            </div>

            {/* Seleção de Produtos do Catálogo */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-foreground">
                  Produtos Participantes da Pré-venda *
                </Label>
                <span className="text-xs text-muted-foreground">
                  {editingDrop.items.length} produto(s) selecionado(s)
                </span>
              </div>

              {formErrors.items && (
                <p className="text-xs text-destructive">{formErrors.items[0]}</p>
              )}

              {availableProducts.length === 0 ? (
                <div className="p-4 bg-muted/40 rounded-lg text-center text-xs text-muted-foreground">
                  Nenhum produto cadastrado no catálogo. Cadastre produtos na aba Produtos antes de agendar a pré-venda.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {availableProducts.map((product) => {
                    const isSelected = editingDrop.items.some(
                      (item) => item.product_id === product.id
                    )
                    const selectedItem = editingDrop.items.find(
                      (item) => item.product_id === product.id
                    )

                    return (
                      <div
                        key={product.id}
                        className={`p-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'border-primary/50 bg-primary/5 shadow-xs'
                            : 'border-border/60 hover:border-border bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer flex-1 select-none"
                            onClick={() => handleToggleProductInDrop(product)}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onClick={(e) => e.stopPropagation()}
                              onChange={() => handleToggleProductInDrop(product)}
                              className="rounded border-input text-primary size-4 cursor-pointer"
                            />
                            <div className="size-9 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0 relative">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <ImageIcon className="size-4 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">
                                {product.name}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Preço Padrão: {formatCurrency(product.price)}
                              </p>
                            </div>
                          </div>

                          {/* Inputs de Estoque Alocado e Preço da Pré-venda para o item selecionado */}
                          {isSelected && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div>
                                <span className="text-[10px] text-muted-foreground block font-medium">
                                  Estoque Pré-venda *
                                </span>
                                <Input
                                  type="number"
                                  min="1"
                                  className="w-20 h-7 text-xs"
                                  value={selectedItem?.allocated_quantity ?? 10}
                                  onChange={(e) =>
                                    handleUpdateDropItem(
                                      product.id,
                                      'allocated_quantity',
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  required
                                />
                              </div>

                              <div>
                                <span className="text-[10px] text-muted-foreground block font-medium">
                                  Preço Pré-venda (R$)
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="Opcional"
                                  className="w-24 h-7 text-xs"
                                  value={selectedItem?.promotional_price ?? ''}
                                  onChange={(e) =>
                                    handleUpdateDropItem(
                                      product.id,
                                      'promotional_price',
                                      e.target.value ? parseFloat(e.target.value) : null
                                    )
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    Salvando Pré-venda...
                  </>
                ) : (
                  'Salvar e Agendar Pré-venda'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
