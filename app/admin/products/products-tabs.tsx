'use client'

import * as React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Package, FolderTree, Boxes } from 'lucide-react'
import type { ProductWithCategory } from '@/lib/domain/products'
import type { Category } from '@/lib/domain/categories'
import type { ComboWithRules } from '@/lib/domain/combos'
import { ProductsClient } from './products-client'
import { CategoriesClient } from '../categories/categories-client'
import { CombosClient } from '../combos/combos-client'

interface ProductsTabsProps {
  initialProducts: ProductWithCategory[]
  availableCategories: Category[]
  initialCombos: ComboWithRules[]
}

type TabType = 'products' | 'categories' | 'combos'

function ProductsTabsContent({
  initialProducts,
  availableCategories,
  initialCombos,
}: ProductsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const currentTabParam = searchParams.get('tab') as TabType | null
  const activeTab: TabType =
    currentTabParam === 'categories' || currentTabParam === 'combos'
      ? currentTabParam
      : 'products'

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'products') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    router.replace(`${pathname}${query}`, { scroll: false })
  }

  const tabs = [
    {
      id: 'products' as const,
      label: 'Produtos',
      icon: Package,
      count: initialProducts.length,
    },
    {
      id: 'categories' as const,
      label: 'Categorias',
      icon: FolderTree,
      count: availableCategories.length,
    },
    {
      id: 'combos' as const,
      label: 'Combos & Caixas',
      icon: Boxes,
      count: initialCombos.length,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1.5 p-1.5 bg-neutral-200/60 rounded-2xl w-full sm:w-fit border border-neutral-200/80 shadow-2xs">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-xl transition-all select-none ${
                isActive
                  ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/80 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/50'
              }`}
            >
              <Icon className={`size-4 shrink-0 ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`} />
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full font-mono tabular-nums leading-none ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-800 font-semibold'
                    : 'bg-neutral-300/60 text-neutral-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'products' && (
          <ProductsClient
            initialProducts={initialProducts}
            availableCategories={availableCategories}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesClient initialCategories={availableCategories} />
        )}
        {activeTab === 'combos' && (
          <CombosClient
            initialCombos={initialCombos}
            availableCategories={availableCategories}
          />
        )}
      </div>
    </div>
  )
}

export function ProductsTabs(props: ProductsTabsProps) {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse bg-neutral-100 rounded-xl" />}>
      <ProductsTabsContent {...props} />
    </React.Suspense>
  )
}

