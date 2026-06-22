import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL('/login', req.url), { status: 303 })
  res.cookies.set('eztips_token', '', { maxAge: 0, path: '/' })
  return res
}
