import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import { getStoreWithActiveDrop } from '@/lib/db/storefront'
import { AdminNav } from '@/components/admin-nav'
import { StorefrontOrganizerClient } from './organizer-client'
import { Store, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Vitrine | AppDrops Admin',
  description:
    'Personalize a aparência, identidade visual e organize seções e produtos da sua vitrine.',
}

export default async function AdminStorefrontOrganizerPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const store = await getStoreByOwner(user.id)
  if (!store) {
    redirect('/admin/settings')
  }

  // Carrega todos os dados reais da vitrine atual
  const storefrontData = await getStoreWithActiveDrop(store.slug)

  return (
    <div className="min-h-screen bg-neutral-50 pt-6 pb-36 md:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Breadcrumb Topo */}
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-neutral-500 font-medium">
          <nav className="flex items-center gap-2">
            <Link href="/admin" className="hover:text-neutral-900 transition-colors">
              Painel
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Vitrine</span>
          </nav>

          {store.slug && (
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-white hover:bg-neutral-100 rounded-lg transition-colors border border-neutral-200 shadow-2xs cursor-pointer"
            >
              <span>Ver Vitrine Oficial</span>
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>

        {/* Navbar de Módulos */}
        <AdminNav store={store} />

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-200/80">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
              <Store className="size-7 text-neutral-900 shrink-0" />
              Vitrine
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Personalize a identidade visual, cores, banners e organize os produtos da sua loja.
            </p>
          </div>
        </div>

        {/* Cliente Interativo com dnd-kit */}
        <StorefrontOrganizerClient
          store={store}
          categories={storefrontData?.categories ?? []}
          products={storefrontData?.catalogProducts ?? []}
          combos={storefrontData?.combos ?? []}
          activeDrops={storefrontData?.activeDrops ?? []}
        />
      </div>
    </div>
  )
}
