import { hash } from 'bcryptjs';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { apiError } from '@/lib/http';

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(254), password: z.string().min(12).max(128) });

export async function POST(request: NextRequest) {
  if (!databaseConfigured) return apiError('Account creation is unavailable until the database is configured.', 503);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Enter a valid name and email. Passwords must be at least 12 characters.', 422);
  const email = parsed.data.email.toLowerCase();
  const exists = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return apiError('An account with this email already exists.', 409);
  const user = await db.user.create({ data: { name: parsed.data.name, email, passwordHash: await hash(parsed.data.password, 12) }, select: { id: true, name: true, email: true, role: true } });
  await createSession(user.id);
  return NextResponse.json({ user }, { status: 201 });
}
