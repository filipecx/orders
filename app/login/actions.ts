'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { authCredentialsSchema, type AuthCredentialsInput } from '@/lib/domain/auth'

import { headers } from 'next/headers'

export type AuthActionResult = {
  success: boolean
  message: string
  errors?: Record<string, string[]>
  requiresEmailConfirmation?: boolean
  redirectTo?: string
}

export async function loginAction(
  formData: AuthCredentialsInput,
  nextUrl?: string
): Promise<AuthActionResult> {
  const validationResult = authCredentialsSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos. Verifique os campos preenchidos.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  const { email, password } = validationResult.data

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[loginAction] Erro de login:', error.message)
      let message = 'E-mail ou senha incorretos. Tente novamente.'
      if (error.message.includes('Email not confirmed')) {
        message = 'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
      }
      return {
        success: false,
        message,
      }
    }

    if (!data.user) {
      return {
        success: false,
        message: 'Não foi possível autenticar o usuário.',
      }
    }

    const destination = nextUrl && nextUrl.startsWith('/admin') ? nextUrl : '/admin'
    return {
      success: true,
      message: 'Autenticado com sucesso!',
      redirectTo: destination,
    }
  } catch (error) {
    console.error('[loginAction] Erro inesperado:', error)
    return {
      success: false,
      message: 'Ocorreu um erro ao tentar entrar. Tente novamente mais tarde.',
    }
  }
}

export async function signUpAction(
  formData: AuthCredentialsInput,
  _clientOrigin?: string
): Promise<AuthActionResult> {
  const validationResult = authCredentialsSchema.safeParse(formData)

  if (!validationResult.success) {
    return {
      success: false,
      message: 'Dados inválidos. Verifique os campos preenchidos.',
      errors: validationResult.error.flatten().fieldErrors,
    }
  }

  const { email, password } = validationResult.data

  try {
    const supabase = await createClient()

    // Prevenção contra Email Redirect Poisoning: deriva a URL base com segurança no servidor
    let appBaseUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appBaseUrl) {
      if (process.env.NODE_ENV === 'production') {
        console.warn(
          '[signUpAction] NEXT_PUBLIC_APP_URL não está configurada. Fallback perigoso evitado.'
        )
        // Podemos forçar um erro ou usar um fallback seguro dependendo do host da vercel,
        // mas o correto é exigir a env var.
        appBaseUrl = 'https://example.com' // Deve falhar visivelmente
      } else {
        appBaseUrl = 'http://localhost:3000'
      }
    }

    // Remove trailing slash just in case
    const cleanBaseUrl = appBaseUrl.replace(/\/$/, '')
    const redirectUrl = `${cleanBaseUrl}/auth/callback?next=/admin`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      console.error('[signUpAction] Erro de cadastro:', error.message)
      let message = error.message
      if (error.message.includes('User already registered')) {
        message = 'Este e-mail já está cadastrado. Tente fazer login.'
      }
      return {
        success: false,
        message,
      }
    }

    // Se a confirmação de e-mail estiver desabilitada no Supabase (login instantâneo)
    if (data.session) {
      return {
        success: true,
        message: 'Conta criada com sucesso! Redirecionando...',
        requiresEmailConfirmation: false,
        redirectTo: '/admin',
      }
    }

    // Se exigir confirmação por e-mail
    return {
      success: true,
      message:
        'Conta criada! Enviamos um link de confirmação para o seu e-mail.',
      requiresEmailConfirmation: true,
    }
  } catch (error) {
    console.error('[signUpAction] Erro inesperado:', error)
    return {
      success: false,
      message: 'Ocorreu um erro ao criar a conta. Tente novamente mais tarde.',
    }
  }
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
