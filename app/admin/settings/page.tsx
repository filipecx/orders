import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getStoreByOwner } from '@/lib/db/stores'
import { getFaqsByStoreId } from '@/lib/db/faqs'
import type { Faq } from '@/lib/domain/faqs'
import { SettingsForm } from './settings-form'
import { AdminNav } from '@/components/admin-nav'
import { Store, ShieldAlert, LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Configurações da Loja | AppDrops Admin',
  description: 'Gerencie horários de funcionamento, regras de atendimento, FAQs e dados da sua loja.',
}

export default async function AdminSettingsPage() {
  let user = null
  let store = null
  let faqs: Faq[] = []
  let authWarning = false

  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    user = authUser

    if (user) {
      store = await getStoreByOwner(user.id)
      if (store) {
        faqs = await getFaqsByStoreId(store.id)
      }
    } else {
      authWarning = true
    }
  } catch (error) {
    console.error('[AdminSettingsPage] Erro ao carregar dados do usuário/loja/faqs:', error)
    authWarning = true
  }

  return (
    <div className="min-h-screen bg-neutral-50 pt-6 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 1. Breadcrumbs Topo & Botão Sair */}
        <div className="flex items-center justify-between gap-4 text-xs sm:text-sm text-neutral-500 font-medium">
          <nav className="flex items-center gap-2">
            <Link
              href="/admin"
              className="hover:text-neutral-900 transition-colors"
            >
              Painel
            </Link>
            <span>/</span>
            <span className="text-neutral-900 font-semibold">Configurações</span>
          </nav>

          {user && (
            <form action={async () => {
              'use server'
              const { signOutAction } = await import('@/app/login/actions')
              await signOutAction()
            }}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200 shadow-2xs cursor-pointer"
                title="Encerrar sessão"
              >
                <LogOut className="size-3.5 shrink-0" />
                <span>Sair</span>
              </button>
            </form>
          )}
        </div>

        {/* 2. Navbar de Módulos */}
        <AdminNav store={store} />

        {/* 3. Cabeçalho da Página (Abaixo da Navbar) */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900 flex items-center gap-2.5 font-heading">
            <Store className="size-7 text-neutral-900 shrink-0" />
            Configurações da Loja
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500">
            Defina identidade, canais de atendimento, horários de funcionamento, FAQs e chave PIX.
          </p>
        </div>


        {/* Aviso caso o usuário não esteja logado */}
        {authWarning && !user && (
          <div className="flex items-start gap-3 p-4 rounded-xl text-sm bg-amber-50 text-amber-900 border border-amber-200">
            <ShieldAlert className="size-5 shrink-0 mt-0.5 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-900">Modo de Visualização / Não Autenticado</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Para salvar as configurações no Supabase, é necessário estar autenticado com uma conta de lojista.
              </p>
            </div>
          </div>
        )}

        {/* Formulário Interativo de Configurações */}
        <SettingsForm initialStore={store} initialFaqs={faqs} userEmail={user?.email} />
      </div>
    </div>
  )
}
