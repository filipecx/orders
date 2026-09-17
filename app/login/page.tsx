import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './login-form'
import { Loader2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Entrar ou Cadastrar | AppDrops Lojista',
  description: 'Acesse seu painel administrativo do AppDrops para gerenciar sua loja e seus drops.',
}

function LoginFormFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center items-center px-4 py-12 sm:px-6 lg:px-8">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
