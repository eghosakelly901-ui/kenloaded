import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { databaseConfigured } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function POST(_request: Request, context: { params: Promise<{ songId: string }> }) {
  if (!databaseConfigured) return apiError('Favorites are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to save favorites.', 401);
  const { songId } = await context.params;
  const song = await db.song.findFirst({ where: { id: songId, uploadStatus: 'APPROVED' }, select: { id: true } });
  if (!song) return apiError('Song not found.', 404);
  await db.favorite.upsert({ where: { userId_songId: { userId: user.id, songId } }, update: {}, create: { userId: user.id, songId } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function DELETE(_request: Request, context: { params: Promise<{ songId: string }> }) {
  if (!databaseConfigured) return apiError('Favorites are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to edit favorites.', 401);
  const { songId } = await context.params;
  await db.favorite.deleteMany({ where: { userId: user.id, songId } });
  return NextResponse.json({ ok: true });
}
