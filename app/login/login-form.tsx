'use client'

import * as React from 'react'
import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { loginAction, signUpAction } from './actions'
import {
  Loader2,
  Lock,
  Mail,
  Store,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  UserPlus,
  LogIn,
} from 'lucide-react'

interface LoginFormProps {
  defaultMode?: 'login' | 'signup'
}

export function LoginForm({ defaultMode }: LoginFormProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next') ?? '/admin'
  const modeParam = searchParams.get('mode')
  const errorParam = searchParams.get('error')

  const initialMode =
    defaultMode ?? (modeParam === 'signup' ? 'signup' : 'login')
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPending, startTransition] = useTransition()

  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(
    errorParam === 'auth_callback_failed'
      ? {
          type: 'error',
          text: 'O link de autenticação expirou ou é inválido. Tente novamente.',
        }
      : null
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrors({})
    setStatusMessage(null)

    startTransition(async () => {
      if (mode === 'login') {
        const res = await loginAction({ email, password }, nextParam)
        if (res.success && res.redirectTo) {
          setStatusMessage({
            type: 'success',
            text: 'Login realizado! Redirecionando...',
          })
          router.push(res.redirectTo)
          router.refresh()
        } else {
          setStatusMessage({
            type: 'error',
            text: res.message,
          })
          if (res.errors) {
            setErrors(res.errors)
          }
        }
      } else {
        const res = await signUpAction({ email, password })
        if (res.success) {
          if (res.redirectTo) {
            setStatusMessage({
              type: 'success',
              text: res.message,
            })
            router.push(res.redirectTo)
            router.refresh()
          } else {
            setStatusMessage({
              type: 'success',
              text: res.message,
            })
          }
        } else {
          setStatusMessage({
            type: 'error',
            text: res.message,
          })
          if (res.errors) {
            setErrors(res.errors)
          }
        }
      }
    })
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="size-12 rounded-2xl bg-neutral-900 flex items-center justify-center text-white shadow-xs">
          <Store className="size-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          AppDrops Lojista
        </h1>
        <p className="text-xs text-neutral-500 max-w-xs">
          Gerencie sua loja, configure suas pré-vendas e acompanhe pedidos em tempo real.
        </p>
      </div>

      {/* Toggle entre Entrar e Cadastrar */}
      <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => {
            setMode('login')
            setErrors({})
            setStatusMessage(null)
          }}
          className={`flex items-center justify-center gap-2 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'login'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <LogIn className="size-3.5" />
          Entrar
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('signup')
            setErrors({})
            setStatusMessage(null)
          }}
          className={`flex items-center justify-center gap-2 min-h-[44px] py-2 text-xs font-semibold rounded-lg transition-all ${
            mode === 'signup'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <UserPlus className="size-3.5" />
          Criar Conta
        </button>
      </div>

      {/* Feedback Message */}
      {statusMessage && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium border transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-700" />
          ) : (
            <AlertCircle className="size-5 shrink-0 mt-0.5 text-rose-700" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Card do Formulário */}
      <div className="bg-white border border-neutral-200/80 rounded-xl shadow-xs p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-neutral-900">
              {mode === 'login' ? 'Acesse seu painel' : 'Crie sua conta de lojista'}
            </h2>
            <p className="text-xs text-neutral-500">
              {mode === 'login'
                ? 'Insira suas credenciais para continuar'
                : 'Preencha com seus dados para começar a vender'}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Campo E-mail */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs text-neutral-700">
                <Mail className="size-3.5 text-neutral-500" />
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="lojista@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isPending}
                aria-invalid={!!errors.email}
                className="bg-white border-neutral-200"
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email[0]}</p>
              )}
            </div>

            {/* Campo Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-xs text-neutral-700">
                <Lock className="size-3.5 text-neutral-500" />
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                disabled={isPending}
                aria-invalid={!!errors.password}
                className="bg-white border-neutral-200"
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password[0]}</p>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full min-h-[44px] bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-lg shadow-xs text-sm"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                  {mode === 'login' ? 'Entrando...' : 'Criando conta...'}
                </>
              ) : mode === 'login' ? (
                <>
                  Entrar no Painel <ArrowRight className="size-4 ml-1.5" />
                </>
              ) : (
                <>
                  Criar Minha Conta <ArrowRight className="size-4 ml-1.5" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-center text-neutral-500">
              {mode === 'login' ? (
                <>
                  Ainda não tem loja?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup')
                      setErrors({})
                      setStatusMessage(null)
                    }}
                    className="text-neutral-900 font-semibold hover:underline"
                  >
                    Cadastre-se gratuitamente
                  </button>
                </>
              ) : (
                <>
                  Já possui cadastro?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login')
                      setErrors({})
                      setStatusMessage(null)
                    }}
                    className="text-neutral-900 font-semibold hover:underline"
                  >
                    Faça login aqui
                  </button>
                </>
              )}
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
