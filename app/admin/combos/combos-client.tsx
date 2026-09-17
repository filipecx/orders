'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
  calculateComboTotalItems,
  type ComboWithRules,
  type ComboInput,
  type ComboRuleInput,
} from '@/lib/domain/combos'
import type { Category } from '@/lib/domain/categories'
import { formatCurrency } from '@/lib/domain/products'
import {
  saveComboAction,
  toggleComboStatusAction,
  deleteComboAction,
} from './actions'
import {
  Plus,
  Search,
  Boxes,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Calendar,
  Zap,
  FolderTree,
  X,
  Sparkles,
} from 'lucide-react'

interface CombosClientProps {
  initialCombos: ComboWithRules[]
  availableCategories: Category[]
}

const emptyComboForm: ComboInput = {
  name: '',
  description: '',
  price: 0,
  sale_type: 'order',
  image_url: '',
  active: true,
  rules: [],
}

export function CombosClient({
  initialCombos,
  availableCategories,
}: CombosClientProps) {
  const [combos, setCombos] = useState<ComboWithRules[]>(initialCombos)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Estado do Modal (Criação / Edição)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ComboInput>(emptyComboForm)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Filtro de busca em tempo real
  const filteredCombos = combos.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const handleOpenCreate = () => {
    // Se houver categorias, já inicia com uma regra padrão se o lojista desejar
    const initialRules: ComboRuleInput[] =
      availableCategories.length > 0
        ? [{ category_id: availableCategories[0].id, required_quantity: 2 }]
        : []

    setEditingCombo({
      ...emptyComboForm,
      rules: initialRules,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (combo: ComboWithRules) => {
    const rulesFormatted: ComboRuleInput[] = combo.rules.map((r) => ({
      id: r.id,
      combo_id: r.combo_id,
      category_id: r.category_id,
      required_quantity: r.required_quantity,
    }))

    setEditingCombo({
      id: combo.id,
      name: combo.name,
      description: combo.description ?? '',
      price: combo.price,
      sale_type: (combo.sale_type as 'ready_delivery' | 'order') ?? 'order',
      image_url: combo.image_url ?? '',
      active: combo.active,
      rules: rulesFormatted,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleAddRule = () => {
    if (availableCategories.length === 0) return
    const nextCategory =
      availableCategories.find(
        (c) => !editingCombo.rules?.some((r) => r.category_id === c.id)
      ) || availableCategories[0]

    setEditingCombo((prev) => ({
      ...prev,
      rules: [
        ...(prev.rules || []),
        { category_id: nextCategory.id, required_quantity: 1 },
      ],
    }))
  }

  const handleRemoveRule = (index: number) => {
    setEditingCombo((prev) => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== index),
    }))
  }

  const handleRuleCategoryChange = (index: number, categoryId: string) => {
    setEditingCombo((prev) => {
      const nextRules = [...(prev.rules || [])]
      nextRules[index] = { ...nextRules[index], category_id: categoryId }
      return { ...prev, rules: nextRules }
    })
  }

  const handleRuleQuantityChange = (index: number, quantity: number) => {
    setEditingCombo((prev) => {
      const nextRules = [...(prev.rules || [])]
      nextRules[index] = {
        ...nextRules[index],
        required_quantity: Math.max(1, quantity),
      }
      return { ...prev, rules: nextRules }
    })
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})
    setFeedback(null)

    startTransition(async () => {
      const res = await saveComboAction(editingCombo)

      if (res.success && res.data) {
        setFeedback({ type: 'success', text: res.message })
        setIsDialogOpen(false)

        const saved = res.data as ComboWithRules
        setCombos((prev) => {
          const index = prev.findIndex((c) => c.id === saved.id)
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

  const handleToggleStatus = (combo: ComboWithRules) => {
    const nextStatus = !combo.active

    startTransition(async () => {
      const res = await toggleComboStatusAction(combo.id, nextStatus)
      if (res.success) {
        setCombos((prev) =>
          prev.map((c) => (c.id === combo.id ? { ...c, active: nextStatus } : c))
        )
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const handleDelete = (comboId: string) => {
    if (!confirm('Tem certeza que deseja excluir este combo?')) return

    startTransition(async () => {
      const res = await deleteComboAction(comboId)
      if (res.success) {
        setCombos((prev) => prev.filter((c) => c.id !== comboId))
        setFeedback({ type: 'success', text: res.message })
      } else {
        setFeedback({ type: 'error', text: res.message })
      }
    })
  }

  const totalItemsCount = calculateComboTotalItems(editingCombo.rules || [])

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

      {/* Barra de Ações: Busca e Novo Combo */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            placeholder="Buscar combos ou caixas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-white border-neutral-200"
          />
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
          <Plus className="size-4 mr-1.5" />
          Novo Combo Promocional
        </Button>
      </div>

      {/* Tabela de Combos */}
      <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white overflow-hidden">
        {filteredCombos.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="size-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-600">
              <Boxes className="size-6" />
            </div>
            <h3 className="font-semibold text-neutral-900">
              Nenhum combo cadastrado
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {search
                ? 'Nenhum resultado corresponde à sua pesquisa.'
                : 'Crie caixas promocionais e combos customizáveis (ex: Caixa Degustação 6 Cookies, Monte Seu Kit de Doces).'}
            </p>
            {!search && (
              <Button onClick={handleOpenCreate} className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium" size="sm">
                <Plus className="size-3.5 mr-1" />
                Cadastrar Primeiro Combo
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-200/80 hover:bg-transparent">
                <TableHead className="w-16 text-neutral-500 text-xs font-medium">Foto</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Combo / Caixa</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Regras de Composição</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Preço Fixo</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Disponibilidade</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Status</TableHead>
                <TableHead className="text-right text-neutral-500 text-xs font-medium">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCombos.map((combo) => (
                <TableRow key={combo.id} className="border-neutral-200/80 hover:bg-neutral-50/80">
                  {/* Imagem */}
                  <TableCell>
                    <div className="size-12 rounded-lg bg-neutral-100 flex items-center justify-center overflow-hidden border border-neutral-200 shrink-0 relative">
                      {combo.image_url ? (
                        <Image
                          src={combo.image_url}
                          alt={combo.name}
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

                  {/* Nome & Descrição */}
                  <TableCell>
                    <div className="font-semibold text-neutral-900">
                      {combo.name}
                    </div>
                    {combo.description && (
                      <div className="text-xs text-neutral-500 line-clamp-1">
                        {combo.description}
                      </div>
                    )}
                  </TableCell>

                  {/* Regras por Categoria */}
                  <TableCell>
                    {combo.rules.length === 0 ? (
                      <span className="text-xs text-neutral-400">
                        Sem regras vinculadas
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {combo.rules.map((rule) => (
                          <span
                            key={rule.id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded-md"
                          >
                            <Sparkles className="size-3 text-neutral-600" />
                            {rule.required_quantity}x{' '}
                            {rule.category?.name || 'Categoria'}
                          </span>
                        ))}
                      </div>
                    )}
                  </TableCell>

                  {/* Preço Fixo */}
                  <TableCell className="font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(combo.price)}
                  </TableCell>

                  {/* Tipo de Venda */}
                  <TableCell>
                    {combo.sale_type === 'order' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 border border-neutral-200 text-neutral-700">
                        <Calendar className="size-3" />
                        📅 Encomenda
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-800">
                        <Zap className="size-3" />
                        🚀 Pronta-Entrega
                      </span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer ${
                        combo.active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}
                      onClick={() => handleToggleStatus(combo)}
                    >
                      {combo.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title={combo.active ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleStatus(combo)}
                      >
                        {combo.active ? (
                          <Eye className="size-4 text-neutral-500" />
                        ) : (
                          <EyeOff className="size-4 text-neutral-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => handleOpenEdit(combo)}
                      >
                        <Edit2 className="size-4 text-neutral-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir"
                        onClick={() => handleDelete(combo.id)}
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

      {/* Modal / Dialog de Cadastro e Edição de Combos */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCombo.id ? 'Editar Combo Promocional' : 'Novo Combo Promocional'}
            </DialogTitle>
            <DialogDescription>
              Configure o preço fechado da caixa e defina quantas unidades de cada categoria o cliente poderá escolher.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome do Combo */}
            <div className="space-y-1.5">
              <Label htmlFor="comboName">Nome do Combo / Caixa *</Label>
              <Input
                id="comboName"
                placeholder="Ex: Caixa Degustação 6 Cookies ou Kit Café da Tarde"
                value={editingCombo.name}
                onChange={(e) =>
                  setEditingCombo({ ...editingCombo, name: e.target.value })
                }
                required
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name[0]}</p>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="comboDesc">Descrição</Label>
              <Input
                id="comboDesc"
                placeholder="Ex: Monte sua caixa com os seus sabores favoritos!"
                value={editingCombo.description ?? ''}
                onChange={(e) =>
                  setEditingCombo({
                    ...editingCombo,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Preço Fixo e Tipo de Venda */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="comboPrice">Preço Fixo da Caixa (R$) *</Label>
                <Input
                  id="comboPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={editingCombo.price || ''}
                  onChange={(e) =>
                    setEditingCombo({
                      ...editingCombo,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                  aria-invalid={!!formErrors.price}
                />
                {formErrors.price && (
                  <p className="text-xs text-destructive">{formErrors.price[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Tipo de Disponibilidade</Label>
                <select
                  value={editingCombo.sale_type}
                  onChange={(e) =>
                    setEditingCombo({
                      ...editingCombo,
                      sale_type: e.target.value as 'ready_delivery' | 'order',
                    })
                  }
                  className="h-9 w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="order">📅 Encomenda</option>
                  <option value="ready_delivery">🚀 Pronta-Entrega</option>
                </select>
              </div>
            </div>

            {/* Foto do Combo com Upload Direto */}
            <div className="space-y-1.5">
              <ImageUploader
                label="Foto do Combo / Caixa"
                value={editingCombo.image_url ?? ''}
                onChange={(url) =>
                  setEditingCombo({
                    ...editingCombo,
                    image_url: url,
                  })
                }
                bucket="products-media"
                pathPrefix="combos"
                aspectRatio={4 / 3}
                suggestedDimensions="800 x 600 px (4:3) ou 800 x 500 px (16:10)"
                hint="💡 Tamanho recomendado: 800 x 600 px (4:3) ou 800 x 500 px (16:10). Mantenha os itens do combo centralizados."
              />
              {formErrors.image_url && (
                <p className="text-xs text-destructive">
                  {formErrors.image_url[0]}
                </p>
              )}
            </div>

            {/* SEÇÃO DE REGRAS POR CATEGORIA */}
            <div className="space-y-3 pt-3 border-t border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <FolderTree className="size-4 text-primary" />
                    Regras de Escolha por Categoria
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Defina quantos itens o cliente deve escolher de cada categoria.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  disabled={availableCategories.length === 0}
                  className="text-xs"
                >
                  <Plus className="size-3.5 mr-1" />
                  Adicionar Regra
                </Button>
              </div>

              {availableCategories.length === 0 ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                  ⚠️ Você ainda não tem categorias cadastradas.{' '}
                  <Link
                    href="/admin/products?tab=categories"
                    className="underline font-semibold hover:text-amber-950 dark:hover:text-amber-100"
                  >
                    Cadastre categorias primeiro
                  </Link>{' '}
                  para vincular às regras deste combo.
                </div>
              ) : (
                <div className="space-y-2">
                  {editingCombo.rules?.map((rule, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/30"
                    >
                      <div className="flex-1 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Categoria Obrigatória
                        </Label>
                        <select
                          value={rule.category_id}
                          onChange={(e) =>
                            handleRuleCategoryChange(index, e.target.value)
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {availableCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 space-y-1">
                        <Label className="text-[11px] text-muted-foreground">
                          Quantidade
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          max="99"
                          value={rule.required_quantity}
                          onChange={(e) =>
                            handleRuleQuantityChange(
                              index,
                              parseInt(e.target.value) || 1
                            )
                          }
                          className="h-8 text-xs text-center font-medium"
                        />
                      </div>

                      <div className="pt-5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveRule(index)}
                          className="text-muted-foreground hover:text-destructive size-8"
                          title="Remover regra"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {editingCombo.rules && editingCombo.rules.length > 0 && (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-primary font-medium">
                      <span>Total de itens para escolha do cliente:</span>
                      <span className="font-bold text-sm">
                        {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  )}
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
                    Salvando...
                  </>
                ) : (
                  'Salvar Combo'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
