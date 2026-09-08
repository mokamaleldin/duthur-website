import 'server-only';

import { createHmac, scryptSync, timingSafeEqual } from 'node:crypto';

export const TEMP_ADMIN_EMAIL = 'mohamed@admin.com';
export const TEMP_ADMIN_COOKIE = 'duthur_temp_admin';

const PASSWORD_SALT = 'duthur-temp-admin-v1';
const PASSWORD_HASH = Buffer.from(
  '8ae286771f91cf2cb8659b1cc0dc0df204a88ed6a7e67ef6b3ba7551c7d03c63',
  'hex',
);
const SESSION_SECRET = '386c4b6fe46b510d3fc0deeac43a440f661fc42fad74f9ef5322a25b6426be80';
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export function verifyTempAdminCredentials(email: string, password: string) {
  if (email.trim().toLowerCase() !== TEMP_ADMIN_EMAIL) return false;

  const candidate = scryptSync(password, PASSWORD_SALT, 32);
  return candidate.length === PASSWORD_HASH.length && timingSafeEqual(candidate, PASSWORD_HASH);
}

export function createTempAdminSession() {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${TEMP_ADMIN_EMAIL}|${expiresAt}`;
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const signature = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyTempAdminSession(value?: string | null) {
  if (!value) return false;
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature) return false;

  const expected = createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  try {
    const payload = Buffer.from(encoded, 'base64url').toString('utf8');
    const [email, expiresAtRaw] = payload.split('|');
    const expiresAt = Number(expiresAtRaw);
    return email === TEMP_ADMIN_EMAIL && Number.isFinite(expiresAt) && expiresAt > Date.now();
  } catch {
    return false;
  }
}

export const TEMP_ADMIN_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
