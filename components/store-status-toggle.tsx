'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Store } from '@/lib/domain/stores'
import { toggleStoreManualClosureAction } from '@/app/admin/settings/actions'
import { Power, PowerOff } from 'lucide-react'

interface StoreStatusToggleProps {
  store: Store | null | undefined
  className?: string
}

export function StoreStatusToggle({ store, className = '' }: StoreStatusToggleProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  if (!store) return null

  const currentSettings = (store.settings as Record<string, unknown>) || {}
  const isPausada = currentSettings.manual_closure === true

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleStoreManualClosureAction(store.id, !isPausada)
      if (result.success) {
        // A Server Action já faz revalidatePath
      } else {
        alert(result.message)
      }
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-xl transition-all border shadow-2xs ${
        isPausada
          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
      } ${isPending ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={isPausada ? 'Loja pausada. Clique para reabrir (automático).' : 'Loja aberta. Clique para pausar.'}
    >
      {isPausada ? <PowerOff className="size-4 shrink-0" /> : <Power className="size-4 shrink-0" />}
      <span>{isPausada ? 'Pausada' : 'Aberta'}</span>
    </button>
  )
}
