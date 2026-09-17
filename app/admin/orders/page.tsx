import type { Metadata } from 'next'
import Link from 'next/link'
import { getStoreByOwner } from '@/lib/db/stores'
import { getActiveOrdersByStoreId, getHistoryOrdersCount } from '@/lib/db/orders'
import { OrdersClient } from './orders-client'
import { AdminNav } from '@/components/admin-nav'
import { StoreStatusToggle } from '@/components/store-status-toggle'
import { ShoppingBag, ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Gestão de Pedidos | AppDrops Admin',
  description: 'Gerencie e acompanhe todos os pedidos da sua loja em tempo real.',
}

export default async function AdminOrdersPage() {
  const store = await getStoreByOwner()
  const [activeOrders, historyCounts] = await Promise.all([
    getActiveOrdersByStoreId(store?.id),
    getHistoryOrdersCount(store?.id),
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
            <span className="text-neutral-900 font-semibold">Pedidos</span>
          </nav>
        </div>

        {/* 2. Navbar de Módulos */}
        <AdminNav store={store} />

        {/* 3. Cabeçalho da Página (Abaixo da Navbar) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
              <ShoppingBag className="size-7 text-neutral-900 shrink-0" />
              Gestão de Pedidos & Cozinha
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Acompanhe a produção do dia, atualize status de entrega e fale diretamente com seus clientes.
            </p>
          </div>
          {store && (
            <div className="shrink-0 flex items-center gap-3">
              <StoreStatusToggle store={store} />
            </div>
          )}
        </div>

        {/* Interface Cliente de Pedidos */}
        <OrdersClient
          initialOrders={activeOrders}
          initialHistoryCounts={historyCounts}
          store={store}
        />
      </div>
    </div>
  )
}

