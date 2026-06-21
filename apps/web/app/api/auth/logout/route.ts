import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  cookieStore.delete('streampay_token')
  const loginUrl = new URL('/login', req.url)
  return NextResponse.redirect(loginUrl)
}
