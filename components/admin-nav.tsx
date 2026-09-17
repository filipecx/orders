'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  Flame,
  Package,
  Settings,
  ExternalLink,
  Store as StoreIcon,
} from 'lucide-react'
import type { Store } from '@/lib/domain/stores'

interface AdminNavProps {
  store?: Store | null
}

export function AdminNav({ store }: AdminNavProps) {
  const pathname = usePathname()
  const storeSlug = store?.slug

  const navItems = [
    {
      label: 'Painel',
      mobileLabel: 'Painel',
      href: '/admin',
      icon: LayoutDashboard,
      isActive: pathname === '/admin',
    },
    {
      label: 'Pedidos',
      mobileLabel: 'Pedidos',
      href: '/admin/orders',
      icon: ShoppingBag,
      isActive: pathname.startsWith('/admin/orders'),
    },
    {
      label: 'Pré-vendas',
      mobileLabel: 'Pré-vendas',
      href: '/admin/drops',
      icon: Flame,
      isActive: pathname.startsWith('/admin/drops'),
    },
    {
      label: 'Produtos',
      mobileLabel: 'Produtos',
      href: '/admin/products',
      icon: Package,
      isActive:
        pathname.startsWith('/admin/products') ||
        pathname.startsWith('/admin/categories') ||
        pathname.startsWith('/admin/combos'),
    },
    {
      label: 'Vitrine',
      mobileLabel: 'Vitrine',
      href: '/admin/storefront',
      icon: StoreIcon,
      isActive: pathname.startsWith('/admin/storefront'),
    },
    {
      label: 'Configurações',
      mobileLabel: 'Ajustes',
      href: '/admin/settings',
      icon: Settings,
      isActive: pathname.startsWith('/admin/settings'),
    },
  ]

  return (
    <>
      {/* 1. NAVBAR DESKTOP / TABLET (No topo da página) */}
      <div className="hidden md:block pb-2 border-b border-neutral-200/80 w-full">
        <nav className="flex items-center gap-2 sm:gap-3 flex-wrap w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-medium rounded-xl transition-all border ${
                  item.isActive
                    ? 'bg-neutral-900 text-white font-semibold border-neutral-900 shadow-sm ring-1 ring-neutral-900/10'
                    : 'text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-100/90 font-medium border-neutral-200/90 hover:border-neutral-300 shadow-2xs'
                }`}
              >
                <Icon className="size-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}

          {storeSlug && (
            <div className="sm:ml-auto flex items-center gap-3">
              <Link
                href={`/${storeSlug}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-neutral-800 bg-neutral-100 hover:bg-neutral-200/90 rounded-xl transition-all border border-neutral-200 shadow-2xs"
              >
                <ExternalLink className="size-4 shrink-0" />
                <span>Ver Vitrine</span>
              </Link>
            </div>
          )}
        </nav>
      </div>

      {/* 2. NAVBAR MOBILE TIPO APP (Fixa na parte inferior da tela, rente à borda de baixo) */}
      <nav
        aria-label="Navegação mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-white/98 backdrop-blur-md border-t border-neutral-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-1 pt-1 select-none flex flex-col justify-center"
        style={{
          height: 'var(--admin-mobile-nav-height, 3.75rem)',
        }}
      >
        <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto items-center w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-colors ${
                  item.isActive
                    ? 'text-neutral-950 font-bold bg-neutral-100/90'
                    : 'text-neutral-500 hover:text-neutral-900 active:bg-neutral-100/50 font-medium'
                }`}
              >
                <Icon
                  className={`size-4.5 shrink-0 transition-transform ${
                    item.isActive ? 'scale-105 text-neutral-950 stroke-[2.25]' : 'text-neutral-500'
                  }`}
                />
                <span className="text-[10px] leading-tight mt-0.5 text-center truncate max-w-full font-medium">
                  {item.mobileLabel}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

    </>
  )
}


