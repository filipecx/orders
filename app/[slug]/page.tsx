import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getStoreWithActiveDrop } from '@/lib/db/storefront'
import { StorefrontClient } from './storefront-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getStoreWithActiveDrop(slug)

  if (!data || !data.store) {
    return {
      title: 'Loja não encontrada | AppDrops',
    }
  }

  const { store, activeDrop } = data
  const title = activeDrop
    ? `${activeDrop.title} | ${store.name}`
    : `${store.name} | Vitrine Oficial`

  return {
    title,
    description:
      store.description ??
      `Acesse os lançamentos e drops exclusivos da ${store.name}.`,
  }
}

export default async function StorefrontPage({ params }: PageProps) {
  const { slug } = await params
  const data = await getStoreWithActiveDrop(slug)

  if (!data || !data.store) {
    notFound()
  }

  return (
    <StorefrontClient
      store={data.store}
      activeDrop={data.activeDrop}
      activeDrops={data.activeDrops}
      catalogProducts={data.catalogProducts}
      categories={data.categories}
      combos={data.combos}
      faqs={data.faqs}
    />
  )
}
