import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { databaseConfigured, db } from '@/lib/db';

const COOKIE = 'k-loaded_session';
const key = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must contain at least 32 characters.');
  return new TextEncoder().encode(secret);
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(key());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUser() {
  if (!databaseConfigured) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    if (!payload.sub) return null;
    return db.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true } });
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  if (!databaseConfigured) return null;
  const user = await getSessionUser();
  return user?.role === 'ADMIN' ? user : null;
}
