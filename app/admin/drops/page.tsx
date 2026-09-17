import type { Metadata } from 'next'
import Link from 'next/link'
import { getStoreByOwner } from '@/lib/db/stores'
import { listDropsByStore } from '@/lib/db/drops'
import { listProductsByStore } from '@/lib/db/products'
import { DropsClient } from './drops-client'
import { AdminNav } from '@/components/admin-nav'
import { Flame, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestão de Pré-vendas | AppDrops Admin',
  description: 'Gerencie e agende pré-vendas com controle de estoque, contagem regressiva e pedidos antecipados.',
}

export default async function AdminDropsPage() {
  const [store, drops, products] = await Promise.all([
    getStoreByOwner(),
    listDropsByStore(),
    listProductsByStore(),
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
            <span className="text-neutral-900 font-semibold">Pré-vendas</span>
          </nav>
        </div>

        {/* 2. Navbar de Módulos */}
        <AdminNav store={store} />

        {/* 3. Cabeçalho da Página (Abaixo da Navbar) */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
            <Flame className="size-7 text-neutral-900 shrink-0" />
            Gestão de Pré-vendas e Fornadas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Crie campanhas com prazo e estoque alocado para produzir sob demanda sem desperdício.
          </p>
        </div>

        {/* Client Interface */}
        <DropsClient initialDrops={drops} availableProducts={products} />
      </div>
    </div>
  )
}

