import { NextResponse } from 'next/server';
import {
  createTempAdminSession,
  TEMP_ADMIN_COOKIE,
  TEMP_ADMIN_MAX_AGE_SECONDS,
  verifyTempAdminCredentials,
} from '@/lib/temp-admin';

export async function POST(request: Request) {
  let body: { email?: string; password?: string } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const email = String(body.email || '');
  const password = String(body.password || '');

  if (!verifyTempAdminCredentials(email, password)) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(TEMP_ADMIN_COOKIE, createTempAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: TEMP_ADMIN_MAX_AGE_SECONDS,
  });

  return response;
}
