import { compare } from 'bcryptjs';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { apiError } from '@/lib/http';

const schema = z.object({ email: z.email().max(254), password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  if (!databaseConfigured) return apiError('Sign-in is unavailable until the database is configured.', 503);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Enter your email and password.', 422);
  const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await compare(parsed.data.password, user.passwordHash))) return apiError('Email or password is incorrect.', 401);
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
}
