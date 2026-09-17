import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/app/login/login-form'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Criar Conta Grátis | AppDrops',
  description: 'Cadastre sua loja no AppDrops e comece a vender com drops relâmpago hoje mesmo.',
}

function SignupFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<SignupFallback />}>
        <LoginForm defaultMode="signup" />
      </Suspense>
    </div>
  )
}
