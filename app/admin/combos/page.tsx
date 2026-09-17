import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AdminCombosPage() {
  redirect('/admin/products?tab=combos')
}

