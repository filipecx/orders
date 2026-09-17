import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get('origin')
  if (!origin) return null

  // 1. Same origin
  const requestOrigin = request.nextUrl.origin
  if (origin === requestOrigin) return origin

  // 2. Configured public app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      const parsedAppUrl = new URL(appUrl).origin
      if (origin === parsedAppUrl) return origin
    } catch {
      // Ignora erro de parsing de URL
    }
  }

  // 3. Localhost e rede local para testes mobile em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    try {
      const parsed = new URL(origin)
      const hostname = parsed.hostname
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
      ) {
        return origin
      }
    } catch {
      return null
    }
  }

  return null
}

export async function updateSession(request: NextRequest) {
  const allowedOrigin = getAllowedOrigin(request)

  // Tratamento seguro de Preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    if (!allowedOrigin) {
      return new NextResponse(null, { status: 403 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':
          'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Next-Action, Next-Router-State-Tree, Next-Router-Prefetch',
        'Access-Control-Allow-Credentials': 'true',
      },
    })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Injetar headers de CORS apenas se a origem for explicitamente autorizada
  if (allowedOrigin) {
    supabaseResponse.headers.set('Access-Control-Allow-Origin', allowedOrigin)
    supabaseResponse.headers.set('Access-Control-Allow-Credentials', 'true')
    supabaseResponse.headers.set(
      'Access-Control-Allow-Methods',
      'GET,POST,PUT,PATCH,DELETE,OPTIONS'
    )
    supabaseResponse.headers.set(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Next-Action, Next-Router-State-Tree, Next-Router-Prefetch'
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // IMPORTANT: Do NOT use supabase.auth.getSession() in middleware.
  // Using getUser() validates the token against the Supabase Auth server.
  let user = null
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser
  } catch (err) {
    console.error('[Middleware] Erro ao validar sessão no Supabase Auth:', err)
  }

  const pathname = request.nextUrl.pathname

  // Proteger rotas /admin/* de usuários não autenticados
  if (!user && pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Redirecionar usuário logado que acessa /login de volta para /admin/settings
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    const nextParam = request.nextUrl.searchParams.get('next')
    url.pathname = nextParam && nextParam.startsWith('/admin') ? nextParam : '/admin/settings'
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
