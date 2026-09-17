import type { Metadata } from 'next'
import Link from 'next/link'
import { getStoreByOwner } from '@/lib/db/stores'
import { listProductsByStore } from '@/lib/db/products'
import { listCategoriesByStore } from '@/lib/db/categories'
import { listCombosByStore } from '@/lib/db/combos'
import { ProductsTabs } from './products-tabs'
import { AdminNav } from '@/components/admin-nav'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gerenciar Produtos | AppDrops Admin',
  description: 'Gerencie produtos, categorias e combos promocionais da sua loja.',
}

export default async function AdminProductsPage() {
  const [store, products, categories, combos] = await Promise.all([
    getStoreByOwner(),
    listProductsByStore(),
    listCategoriesByStore(),
    listCombosByStore(),
  ])

  return (
    <div className="min-h-screen bg-neutral-50 pt-6 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Breadcrumbs Topo */}
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-neutral-500 font-medium">
          <nav className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hover:text-neutral-900 transition-colors"
            >
              Painel
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Gerenciar produtos</span>
          </nav>
        </div>

        {/* 2. Navbar de Módulos */}
        <AdminNav store={store} />

        {/* 3. Cabeçalho da Página (Abaixo da Navbar) */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
            <Package className="size-7 text-neutral-900 shrink-0" />
            Gerenciar Produtos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Cadastre e gerencie produtos de pronta-entrega e encomenda, categorias e combos promocionais.
          </p>
        </div>

        {/* 3. Abas de Produtos, Categorias e Combos */}
        <ProductsTabs
          initialProducts={products}
          availableCategories={categories}
          initialCombos={combos}
        />
      </div>
    </div>
  )
}

