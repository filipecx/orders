import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')

  // Prevenção contra Open Redirect: aceita somente caminhos relativos válidos no domínio local
  let safeNext = '/admin'
  if (
    rawNext &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.includes('\\') &&
    !rawNext.includes(':')
  ) {
    safeNext = rawNext
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  let baseUrl = origin
  if (!isLocalEnv) {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
    }
  }

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        return NextResponse.redirect(`${baseUrl}${safeNext}`)
      } else {
        console.error('[auth/callback] Erro ao trocar código por sessão:', error)
      }
    } catch (err) {
      console.error('[auth/callback] Erro inesperado no callback:', err)
    }
  }

  // Redireciona para o login com flag de erro se o token for inválido/expirado
  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_failed`)
}
