import { NextResponse } from 'next/server';
import { TEMP_ADMIN_COOKIE } from '@/lib/temp-admin';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEMP_ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
