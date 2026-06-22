import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const next  = searchParams.get('next') ?? '/dashboard'

  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  const IS_PROD = process.env.NODE_ENV === 'production'
  const res = NextResponse.redirect(new URL(next, req.url))
  res.cookies.set('eztips_token', token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  return res
}
