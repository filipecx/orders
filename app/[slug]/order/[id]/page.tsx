import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getOrderById, lazyCancelOrderIfStoreClosed } from '@/lib/db/orders'
import { OrderConfirmationClient } from './order-confirmation-client'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ slug: string; id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = await getOrderById(id)

  if (!order) {
    return {
      title: 'Pedido não encontrado | AppDrops',
    }
  }

  return {
    title: `Pedido #${order.order_number} Confirmado | ${order.store?.name ?? 'AppDrops'}`,
    description: 'Acompanhe seu pedido e realize o pagamento via PIX.',
  }
}

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { slug, id } = await params
  let order = await getOrderById(id)

  if (!order || !order.store || order.store.slug !== slug) {
    notFound()
  }

  order = await lazyCancelOrderIfStoreClosed(order as any) as any
  if (!order || !order.store) return notFound()

  return <OrderConfirmationClient order={order as any} store={order.store} />
}
