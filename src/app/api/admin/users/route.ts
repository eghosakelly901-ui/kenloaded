import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { uploadedSongs: true, downloads: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return apiError('Administrator access required.', 403);
  const parsed = z.object({ userId: z.string().min(1), role: z.enum(['USER', 'ADMIN']) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Provide a valid user and role.', 422);
  if (admin.id === parsed.data.userId && parsed.data.role !== 'ADMIN') return apiError('You cannot remove your own administrator access.', 409);
  const count = await db.user.count({ where: { role: 'ADMIN' } });
  const existing = await db.user.findUnique({ where: { id: parsed.data.userId }, select: { role: true } });
  if (existing?.role === 'ADMIN' && parsed.data.role === 'USER' && count <= 1) return apiError('At least one administrator account must remain.', 409);
  const user = await db.user.update({ where: { id: parsed.data.userId }, data: { role: parsed.data.role }, select: { id: true, name: true, email: true, role: true } });
  return NextResponse.json({ user });
}