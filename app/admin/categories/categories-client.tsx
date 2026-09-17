'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Category, CategoryInput } from '@/lib/domain/categories'
import { saveCategoryAction, deleteCategoryAction } from './actions'
import {
  Plus,
  Search,
  FolderTree,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowUpDown,
} from 'lucide-react'

interface CategoriesClientProps {
  initialCategories: Category[]
}

const emptyCategoryForm: CategoryInput = {
  name: '',
  description: '',
  sort_order: 0,
  is_active: true,
}

export function CategoriesClient({
  initialCategories,
}: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()

  // Estado do Modal
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryInput>(emptyCategoryForm)
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({})
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Filtro de busca
  const filteredCategories = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  )

  const handleOpenCreate = () => {
    setEditingCategory(emptyCategoryForm)
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (category: Category) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
      sort_order: category.sort_order ?? 0,
      is_active: category.is_active ?? true,
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormErrors({})
    setFeedback(null)

    startTransition(async () => {
      const res = await saveCategoryAction(editingCategory)

      if (res.success && res.data) {
        setFeedback({ type: 'success', text: res.message })
        setIsDialogOpen(false)

        const saved = res.data as Category
        setCategories((prev) => {
          const index = prev.findIndex((c) => c.id === saved.id)
          if (index >= 0) {
            const next = [...prev]
            next[index] = saved
            return next
          }
          return [...prev, saved]
        })
      } else {
        setFeedback({ type: 'error', text: res.message })
        if (res.errors) {
          setFormErrors(res.errors)
        }
      }
    })
  }

  const handleDelete = (categoryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

    startTransition(async () => {
      const res = await deleteCategoryAction(categoryId)
      if (res.success) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryId))
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

      {/* Barra de Ações: Busca e Nova Categoria */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            placeholder="Buscar por categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-white border-neutral-200"
          />
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-medium">
          <Plus className="size-4 mr-1.5" />
          Nova Categoria
        </Button>
      </div>

      {/* Tabela de Categorias */}
      <div className="border border-neutral-200/80 rounded-xl shadow-xs bg-white overflow-hidden">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="size-12 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-600">
              <FolderTree className="size-6" />
            </div>
            <h3 className="font-semibold text-neutral-900">
              Nenhuma categoria encontrada
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {search
                ? 'Nenhum resultado corresponde à sua pesquisa.'
                : 'Crie categorias para organizar seu catálogo (ex: Cookies Tradicionais, Doces Finos, Pães Artesanais).'}
            </p>
            {!search && (
              <Button onClick={handleOpenCreate} className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium" size="sm">
                <Plus className="size-3.5 mr-1" />
                Cadastrar Primeira Categoria
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-200/80 hover:bg-transparent">
                <TableHead className="w-16 text-neutral-500 text-xs font-medium">Ordem</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Nome da Categoria</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Descrição</TableHead>
                <TableHead className="text-neutral-500 text-xs font-medium">Status</TableHead>
                <TableHead className="text-right text-neutral-500 text-xs font-medium">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories.map((cat) => (
                <TableRow key={cat.id} className="border-neutral-200/80 hover:bg-neutral-50/80">
                  {/* Ordem */}
                  <TableCell className="font-mono text-xs text-neutral-500">
                    <div className="flex items-center gap-1">
                      <ArrowUpDown className="size-3 text-neutral-400" />
                      {cat.sort_order ?? 0}
                    </div>
                  </TableCell>

                  {/* Nome */}
                  <TableCell className="font-semibold text-neutral-900">
                    {cat.name}
                  </TableCell>

                  {/* Descrição */}
                  <TableCell className="text-neutral-500 text-xs max-w-xs truncate">
                    {cat.description || '—'}
                  </TableCell>

                  {/* Status */}
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        cat.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}
                    >
                      {cat.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => handleOpenEdit(cat)}
                      >
                        <Edit2 className="size-4 text-neutral-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Excluir"
                        onClick={() => handleDelete(cat.id)}
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

      {/* Modal de Criação / Edição de Categoria */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory.id ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              Categorias ajudam a agrupar itens no catálogo e definem regras de combos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="categoryName">Nome da Categoria *</Label>
              <Input
                id="categoryName"
                placeholder="Ex: Cookies Especiais, Pães de Fermentação Natural"
                value={editingCategory.name}
                onChange={(e) =>
                  setEditingCategory({ ...editingCategory, name: e.target.value })
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
              <Label htmlFor="categoryDesc">Descrição (Opcional)</Label>
              <Input
                id="categoryDesc"
                placeholder="Breve resumo da categoria..."
                value={editingCategory.description ?? ''}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Ordem de Exibição */}
            <div className="space-y-1.5">
              <Label htmlFor="sortOrder">Ordem de Exibição</Label>
              <Input
                id="sortOrder"
                type="number"
                value={editingCategory.sort_order ?? 0}
                onChange={(e) =>
                  setEditingCategory({
                    ...editingCategory,
                    sort_order: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-[11px] text-muted-foreground">
                Menor número aparece primeiro no cardápio e nos filtros.
              </p>
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
                  'Salvar Categoria'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
