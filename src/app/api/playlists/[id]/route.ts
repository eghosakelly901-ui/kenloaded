import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

const schema = z.object({ name: z.string().trim().min(1).max(80).optional(), visibility: z.enum(['PUBLIC', 'PRIVATE']).optional() }).refine((value) => Object.keys(value).length > 0);
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const { id } = await context.params;
  const user = await getSessionUser();
  const playlist = await db.playlist.findFirst({ where: { id, OR: [{ userId: user?.id ?? '' }, { visibility: 'PUBLIC' }] }, include: { user: { select: { name: true } }, songs: { orderBy: { position: 'asc' }, include: { song: { include: { artist: { select: { name: true } }, album: { select: { title: true } }, genre: { select: { name: true } } } } } } } });
  if (!playlist) return apiError('Playlist not found.', 404);
  return NextResponse.json({ playlist });
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to edit this playlist.', 401);
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Provide a valid playlist update.', 422);
  const result = await db.playlist.updateMany({ where: { id, userId: user.id }, data: parsed.data });
  if (!result.count) return apiError('Playlist not found.', 404);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to delete this playlist.', 401);
  const { id } = await context.params;
  const result = await db.playlist.deleteMany({ where: { id, userId: user.id } });
  if (!result.count) return apiError('Playlist not found.', 404);
  return NextResponse.json({ ok: true });
}
