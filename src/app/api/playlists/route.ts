import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

const createSchema = z.object({ name: z.string().trim().min(1).max(80), visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE') });
export async function GET() {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to view playlists.', 401);
  const playlists = await db.playlist.findMany({ where: { userId: user.id }, include: { songs: { orderBy: { position: 'asc' }, include: { song: { include: { artist: { select: { name: true } }, genre: { select: { name: true } } } } } } }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ playlists });
}
export async function POST(request: NextRequest) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to create a playlist.', 401);
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Enter a playlist name.', 422);
  const playlist = await db.playlist.create({ data: { ...parsed.data, userId: user.id } });
  return NextResponse.json({ playlist }, { status: 201 });
}
