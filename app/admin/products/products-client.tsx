'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ImageUploader } from '@/components/admin/image-uploader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  formatCurrency,
  type ProductWithCategory,
  type ProductInput,
} from '@/lib/domain/products'
import type { Category } from '@/lib/domain/categories'
import {
  saveProductAction,
  toggleProductStatusAction,
  deleteProductAction,
} from './actions'
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Tag,
  Clock,
  Zap,
  Calendar,
  FolderTree,
} from 'lucide-react'

interface ProductsClientProps {
  initialProducts: ProductWithCategory[]
  availableCategories?: Category[]
}

const emptyProductForm: ProductInput = {
  name: '',
  description: '',
  price: 0,
  promotional_price: null,
  allow_ready_delivery: true,
  allow_order: false,
  different_prices_by_mode: false,
  price_ready_delivery: null,
  price_order: null,
  sale_type: 'ready_delivery',
  lead_time_days: 0,
  category_id: null,
  image_url: '',
  images: [],
  sku: '',
  track_stock: false,
  stock_quantity: 0,
  sort_order: 0,
  is_active: true,
}

export function ProductsClient({
  initialProducts,
  availableCategories = [],
}: ProductsClientProps) {
  const [products, setProducts] = useState<ProductWithCategory[]>(initialProducts)
  const [search, setSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [isPending, startTransition] = useTransition()

  // Estado do Modal (Criação / Edição)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductInput>(emptyProductForm)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Filtro de busca em tempo real (nome, sku ou categoria)
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase())) ||
      (p.category?.name && p.category.name.toLowerCase().includes(search.toLowerCase()))

    const matchesCategory =
      selectedCategoryFilter === 'all' || p.category_id === selectedCategoryFilter

    return matchesSearch && matchesCategory
  })

  const handleOpenCreate = () => {
    setEditingProduct(emptyProductForm)
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (product: ProductWithCategory) => {
    const allowReady = product.allow_ready_delivery ?? (product.sale_type !== 'order')
    const allowOrder = product.allow_order ?? (product.sale_type === 'order' || product.sale_type === 'both')

    setEditingProduct({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      promotional_price: product.promotional_price ?? null,
      allow_ready_delivery: allowReady,
      allow_order: allowOrder,
      different_prices_by_mode: product.different_prices_by_mode ?? false,
      price_ready_delivery: product.price_ready_delivery ?? null,
      price_order: product.price_order ?? null,
      sale_type: (product.sale_type as 'ready_delivery' | 'order' | 'both') ?? 'ready_delivery',
      lead_time_days: product.lead_time_days ?? 0,
      category_id: product.category_id ?? null,
      image_url: product.image_url ?? '',
      images: product.images ?? [],
      sku: product.sku ?? '',
      track_stock: product.track_stock ?? false,
      stock_quantity: product.stock_quantity ?? 0,
      sort_order: product.sort_order ?? 0,
      is_active: product.is_active ?? true,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})
    setFeedback(null)

    startTransition(async () => {
      const res = await saveProductAction(editingProduct)

      if (res.success && res.data) {
        setFeedback({ type: 'success', text: res.message })
        setIsDialogOpen(false)

        const saved = res.data as ProductWithCategory
        // Anexa dados da categoria na lista local para renderização imediata
        const categoryObj = availableCategories.find((c) => c.id === saved.category_id) ?? null
        const productWithCat: ProductWithCategory = {
          ...saved,
          category: categoryObj,
        }

        setProducts((prev) => {
          const index = prev.findIndex((p) => p.id === saved.id)
          if (index >= 0) {
            const next = [...prev]
            next[index] = productWithCat
            return next
          }
          return [productWithCat, ...prev]
        })
      } else {
        setFeedback({ type: 'error', text: res.message })
        if (res.errors) {
          setFormErrors(res.errors)
        }
      }
    })
  }

  const handleToggleStatus = (product: ProductWithCategory) => {
    const nextStatus = !product.is_active

    startTransition(async () => {
      const res = await toggleProductStatusAction(product.id, nextStatus)
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, is_active: nextStatus } : p))
        )
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const handleDelete = (productId: string) => {
    if (!confirm('Tem certeza que deseja remover este produto?')) return

    startTransition(async () => {
      const res = await deleteProductAction(productId)
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== productId))
        setFeedback({ type: 'success', text: res.message })
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
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

      {/* Barra de Ações: Busca, Filtro de Categoria e Novo Produto */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-2.5 w-full sm:max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              placeholder="Buscar por nome, SKU ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-white border-neutral-200"
            />
          </div>

          {availableCategories.length > 0 && (
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-neutral-900/10 sm:w-48 cursor-pointer"
            >
              <option value="all">Todas as Categorias</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <Button onClick={handleOpenCreate} className="w-full sm:w-auto shrink-0 bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
          <Plus className="size-4 mr-1.5" />
          Novo Produto
        </Button>
      </div>

      {/* Tabela de Produtos */}
      <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="size-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-600">
              <Package className="size-6" />
            </div>
            <h3 className="font-semibold text-neutral-900">
              Nenhum produto encontrado
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {search || selectedCategoryFilter !== 'all'
                ? 'Nenhum resultado corresponde aos filtros de pesquisa.'
                : 'Comece adicionando produtos ao seu catálogo para disponibilizá-los aos clientes.'}
            </p>
            {!search && selectedCategoryFilter === 'all' && (
              <Button onClick={handleOpenCreate} className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium" size="sm">
                <Plus className="size-3.5 mr-1" />
                Cadastrar Primeiro Produto
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-200/80 hover:bg-transparent">
                <TableHead className="w-16 text-neutral-500 text-xs font-medium">Item</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Nome & Categoria</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Disponibilidade</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Preço</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Estoque</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Status</TableHead>
                <TableHead className="text-right text-neutral-500 text-xs font-medium">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.id} className="border-neutral-200/80 hover:bg-neutral-50/80">
                  {/* Imagem */}
                  <TableCell>
                    <div className="size-12 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 shrink-0 relative">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <ImageIcon className="size-5 text-neutral-400" />
                      )}
                    </div>
                  </TableCell>

                  {/* Nome & Categoria */}
                  <TableCell>
                    <div className="font-semibold text-neutral-900">
                      {product.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.category?.name ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-700 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-md">
                          <FolderTree className="size-3" />
                          {product.category.name}
                        </span>
                      ) : (
                        <span className="text-[11px] text-neutral-400">
                          Sem Categoria
                        </span>
                      )}

                      {product.sku && (
                        <span className="text-[11px] font-mono text-neutral-500 flex items-center gap-1">
                          <Tag className="size-3" />
                          {product.sku}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Tipo de Venda (Disponibilidade & Prazos) */}
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      {product.allow_ready_delivery || product.sale_type === 'ready_delivery' || product.sale_type === 'both' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-800">
                          <Zap className="size-3" />
                          🚀 Pronta-Entrega
                        </span>
                      ) : null}
                      {product.allow_order || product.sale_type === 'order' || product.sale_type === 'both' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 border border-purple-200 text-purple-700">
                            <Calendar className="size-3" />
                            📅 Encomenda
                          </span>
                          <div className="text-[11px] text-neutral-500 flex items-center gap-1 pl-1">
                            <Clock className="size-3" />
                            {(product.lead_time_days ?? 0) > 0
                              ? `${product.lead_time_days}d antecedência`
                              : 'Sem antecedência'}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </TableCell>

                  {/* Preço Padrão & Promocional */}
                  <TableCell>
                    {product.different_prices_by_mode ? (
                      <div className="space-y-0.5 text-xs">
                        <div className="text-neutral-900 tabular-nums">
                          <span className="text-[10px] text-neutral-500 font-medium mr-1">Pronta:</span>
                          <span className="font-semibold">{formatCurrency(product.price_ready_delivery ?? product.price)}</span>
                        </div>
                        <div className="text-neutral-900 tabular-nums">
                          <span className="text-[10px] text-neutral-500 font-medium mr-1">Encomenda:</span>
                          <span className="font-semibold">{formatCurrency(product.price_order ?? product.price)}</span>
                        </div>
                        {product.promotional_price && (
                          <span className="text-[11px] text-emerald-700 font-medium block">
                            Promo: {formatCurrency(product.promotional_price)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold text-neutral-900 tabular-nums">
                          {formatCurrency(product.price)}
                        </div>
                        {product.promotional_price && (
                          <span className="text-xs text-emerald-700 font-medium tabular-nums">
                            Promo: {formatCurrency(product.promotional_price)}
                          </span>
                        )}
                      </div>
                    )}
                  </TableCell>

                  {/* Estoque */}
                  <TableCell>
                    {product.track_stock ? (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border tabular-nums ${
                          (product.stock_quantity ?? 0) > 5
                            ? 'bg-neutral-100 text-neutral-800 border-neutral-200'
                            : (product.stock_quantity ?? 0) > 0
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {product.stock_quantity} un
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500">
                        Ilimitado
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer ${
                        product.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}
                      onClick={() => handleToggleStatus(product)}
                    >
                      {product.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={product.is_active ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleStatus(product)}
                      >
                        {product.is_active ? (
                          <Eye className="size-4 text-neutral-500" />
                        ) : (
                          <EyeOff className="size-4 text-neutral-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => handleOpenEdit(product)}
                      >
                        <Edit2 className="size-4 text-neutral-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir"
                        onClick={() => handleDelete(product.id)}
                        className="hover:text-rose-600"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal / Dialog de Cadastro e Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct.id ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes, categoria, disponibilidade e prazos de produção do produto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="productName">Nome do Produto *</Label>
              <Input
                id="productName"
                placeholder="Ex: Cookie Triplo Chocolate ou Pão Artesanal"
                value={editingProduct.name}
                onChange={(e) =>
                  setEditingProduct({ ...editingProduct, name: e.target.value })
                }
                required
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name[0]}</p>
              )}
            </div>

            {/* Seleção de Categoria */}
            <div className="space-y-1.5">
              <Label htmlFor="productCategory">Categoria</Label>
              <select
                id="productCategory"
                value={editingProduct.category_id ?? ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    category_id: e.target.value || null,
                  })
                }
                className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Sem Categoria (Geral)</option>
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {availableCategories.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Nenhuma categoria cadastrada ainda. Você pode criar em{' '}
                  <span className="font-semibold text-foreground">Admin &gt; Categorias</span>.
                </p>
              )}
            </div>

            {/* Modalidades de Venda: Checkboxes */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Modalidades de Venda *</Label>
                <p className="text-[11px] text-muted-foreground">
                  Escolha como este produto pode ser comercializado na loja.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Checkbox Pronta-Entrega */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editingProduct.allow_ready_delivery
                      ? 'border-emerald-500/50 bg-emerald-500/5 text-foreground ring-1 ring-emerald-500/30'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={editingProduct.allow_ready_delivery}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (!checked && !editingProduct.allow_order) return
                      setEditingProduct({
                        ...editingProduct,
                        allow_ready_delivery: checked,
                        different_prices_by_mode:
                          checked && editingProduct.allow_order
                            ? editingProduct.different_prices_by_mode
                            : false,
                      })
                    }}
                    className="size-4 mt-0.5 rounded border-neutral-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                  />
                  <div className="space-y-0.5 select-none">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      🚀 Permitir Pronta-Entrega
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Disponível para envio imediato no horário da loja
                    </p>
                  </div>
                </label>

                {/* Checkbox Encomenda */}
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    editingProduct.allow_order
                      ? 'border-purple-500/50 bg-purple-500/5 text-foreground ring-1 ring-purple-500/30'
                      : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={editingProduct.allow_order}
                    onChange={(e) => {
                      const checked = e.target.checked
                      if (!checked && !editingProduct.allow_ready_delivery) return
                      setEditingProduct({
                        ...editingProduct,
                        allow_order: checked,
                        lead_time_days: checked ? editingProduct.lead_time_days || 1 : 0,
                        different_prices_by_mode:
                          checked && editingProduct.allow_ready_delivery
                            ? editingProduct.different_prices_by_mode
                            : false,
                      })
                    }}
                    className="size-4 mt-0.5 rounded border-neutral-300 text-purple-600 focus:ring-purple-500 accent-purple-600 cursor-pointer"
                  />
                  <div className="space-y-0.5 select-none">
                    <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      📅 Permitir Encomenda
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Aceito 24h com agendamento de data
                    </p>
                  </div>
                </label>
              </div>

              {formErrors.allow_ready_delivery && (
                <p className="text-xs text-destructive">{formErrors.allow_ready_delivery[0]}</p>
              )}
            </div>

            {/* Campo Condicional: Antecedência Mínima (se for Encomenda) */}
            {editingProduct.allow_order && (
              <div className="space-y-1.5 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <Label htmlFor="leadTimeDays" className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-200">
                  <Clock className="size-3.5 text-purple-600 dark:text-purple-400" />
                  Antecedência Mínima de Produção (em dias) *
                </Label>
                <Input
                  id="leadTimeDays"
                  type="number"
                  min="0"
                  max="365"
                  placeholder="Ex: 2 (cliente deve pedir com 2 dias de antecedência)"
                  value={editingProduct.lead_time_days ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      lead_time_days: Math.max(0, parseInt(e.target.value) || 0),
                    })
                  }
                  required
                  aria-invalid={!!formErrors.lead_time_days}
                  className="bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bloqueia datas anteriores no calendário do checkout (ex: 2 dias = data mais próxima permitida para entrega/retirada será em 2 dias).
                </p>
                {formErrors.lead_time_days && (
                  <p className="text-xs text-destructive">
                    {formErrors.lead_time_days[0]}
                  </p>
                )}
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="productDesc">Descrição</Label>
              <Input
                id="productDesc"
                placeholder="Ingredientes, peso, tamanho ou detalhes adicionais..."
                value={editingProduct.description ?? ''}
                onChange={(e) =>
                  setEditingProduct({
                    ...editingProduct,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Preços: Base e Promocional */}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/40">
              <div className="space-y-1.5">
                <Label htmlFor="productPrice">Preço Base (R$) *</Label>
                <Input
                  id="productPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={editingProduct.price || ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  aria-invalid={!!formErrors.price}
                />
                <p className="text-[10px] text-muted-foreground">
                  Preço padrão de referência.
                </p>
                {formErrors.price && (
                  <p className="text-xs text-destructive">{formErrors.price[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="productPromoPrice">Preço Promocional (R$)</Label>
                <Input
                  id="productPromoPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Opcional"
                  value={editingProduct.promotional_price ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      promotional_price: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                />
                <p className="text-[10px] text-muted-foreground">
                  Desconto global opcional.
                </p>
              </div>
            </div>

            {/* Chave Opcional: Definir preços diferentes por modalidade (quando ambas estão marcadas) */}
            {editingProduct.allow_ready_delivery && editingProduct.allow_order && (
              <div className="space-y-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="toggleDiffPrices" className="text-xs font-semibold text-foreground cursor-pointer">
                      Definir preços diferentes por modalidade
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Permite configurar valores distintos para pronta-entrega e encomenda.
                    </p>
                  </div>

                  <input
                    id="toggleDiffPrices"
                    type="checkbox"
                    checked={editingProduct.different_prices_by_mode ?? false}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        different_prices_by_mode: e.target.checked,
                      })
                    }
                    className="size-4.5 rounded border-neutral-300 text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                </div>

                {/* Inputs de Preço por Modalidade quando a chave está ativada */}
                {editingProduct.different_prices_by_mode && (
                  <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-border/60">
                    <div className="space-y-1.5">
                      <Label htmlFor="priceReadyDelivery" className="text-xs font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Zap className="size-3 text-emerald-600" />
                        Preço Pronta-Entrega (R$)
                      </Label>
                      <Input
                        id="priceReadyDelivery"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={editingProduct.price ? `${formatCurrency(editingProduct.price)} (Base)` : '0,00'}
                        value={editingProduct.price_ready_delivery ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price_ready_delivery: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Se vazio, usa o Preço Base ({formatCurrency(editingProduct.price)}).
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="priceOrder" className="text-xs font-medium text-purple-800 dark:text-purple-300 flex items-center gap-1">
                        <Calendar className="size-3 text-purple-600" />
                        Preço Encomenda (R$)
                      </Label>
                      <Input
                        id="priceOrder"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={editingProduct.price ? `${formatCurrency(editingProduct.price)} (Base)` : '0,00'}
                        value={editingProduct.price_order ?? ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price_order: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Se vazio, usa o Preço Base ({formatCurrency(editingProduct.price)}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Foto do Produto com Upload Direto */}
            <div className="space-y-1.5">
              <ImageUploader
                label="Foto do Produto"
                value={editingProduct.image_url ?? ''}
                onChange={(url) =>
                  setEditingProduct({
                    ...editingProduct,
                    image_url: url,
                  })
                }
                bucket="products-media"
                pathPrefix="products"
                aspectRatio={4 / 3}
                suggestedDimensions="800 x 600 px (4:3) ou 800 x 500 px (16:10)"
                hint="💡 Tamanho recomendado: 800 x 600 px (4:3) ou 800 x 500 px (16:10). Mantenha o alimento centralizado."
              />
              {formErrors.image_url && (
                <p className="text-xs text-destructive">
                  {formErrors.image_url[0]}
                </p>
              )}
            </div>

            {/* SKU e Controle de Estoque */}
            <div className="grid grid-cols-2 gap-3 items-start">
              <div className="space-y-1.5">
                <Label htmlFor="productSku">SKU / Código</Label>
                <Input
                  id="productSku"
                  placeholder="Ex: PROD-001"
                  value={editingProduct.sku ?? ''}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      sku: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stockQty">Estoque Geral</Label>
                <Input
                  id="stockQty"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={editingProduct.stock_quantity ?? 0}
                  onChange={(e) =>
                    setEditingProduct({
                      ...editingProduct,
                      track_stock: true,
                      stock_quantity: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
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
                    Salvando...
                  </>
                ) : (
                  'Salvar Produto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
