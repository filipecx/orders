import type { Metadata } from 'next'
import { getStoreByOwner } from '@/lib/db/stores'
import { listDropsByStore } from '@/lib/db/drops'
import { getOrdersByStoreId } from '@/lib/db/orders'
import { calculateDashboardMetrics } from '@/lib/domain/orders'
import { DashboardClient } from './dashboard-client'
import { AdminNav } from '@/components/admin-nav'
import { StoreStatusToggle } from '@/components/store-status-toggle'
import { isDropActive } from '@/lib/domain/drops'
import {
  LayoutDashboard,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard Principal | AppDrops Admin',
  description: 'Visão geral das vendas, pré-vendas ativas e métricas da sua loja em tempo real.',
}

export default async function AdminDashboardPage() {
  const store = await getStoreByOwner()
  const [drops, orders] = await Promise.all([
    listDropsByStore(store?.id),
    getOrdersByStoreId(store?.id),
  ])

  // Identifica a pré-venda ativa ou a próxima agendada (não expirada)
  const now = Date.now()
  const activeDrop =
    drops.find((d) => isDropActive(d)) ??
    drops.find(
      (d) =>
        d.status === 'scheduled' &&
        (!d.ends_at || new Date(d.ends_at).getTime() >= now)
    ) ??
    null

  // Calcula métricas consolidadas
  const metrics = calculateDashboardMetrics(orders, activeDrop?.id)
  const recentOrders = orders.slice(0, 5)

  return (
    <div className="min-h-screen bg-neutral-50 pt-6 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Breadcrumbs Topo */}
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-neutral-500 font-medium">
          <div className="flex items-center gap-2">
            <span className="text-neutral-900 font-semibold">
              {store?.name ?? 'AppDrops'}
            </span>
            <span>•</span>
            <span>Painel do Lojista</span>
          </div>
        </div>

        {/* 2. Navbar de Módulos */}
        <AdminNav store={store} />

        {/* 3. Cabeçalho da Página (Abaixo da Navbar) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
              <LayoutDashboard className="size-7 text-neutral-900 shrink-0" />
              Visão Geral
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Acompanhe o faturamento, tempo de pré-vendas e pedidos em tempo real.
            </p>
          </div>
          {store && (
            <div className="shrink-0 flex items-center gap-3">
              <StoreStatusToggle store={store} />
            </div>
          )}
        </div>

        {/* Conteúdo do Dashboard */}
        <DashboardClient
          store={store}
          activeDrop={activeDrop}
          recentOrders={recentOrders}
          totalOrdersCount={orders.length}
          metrics={metrics}
        />
      </div>
    </div>
  )
}

