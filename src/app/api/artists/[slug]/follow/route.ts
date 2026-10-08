import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!databaseConfigured) return apiError('Artist follows are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to follow artists.', 401);
  const { slug } = await context.params;
  const artist = await db.artist.findUnique({ where: { slug }, select: { id: true } });
  if (!artist) return apiError('Artist not found.', 404);
  await db.artistFollow.upsert({ where: { userId_artistId: { userId: user.id, artistId: artist.id } }, update: {}, create: { userId: user.id, artistId: artist.id } });
  return NextResponse.json({ following: true }, { status: 201 });
}
export async function DELETE(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!databaseConfigured) return apiError('Artist follows are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to manage followed artists.', 401);
  const { slug } = await context.params;
  const artist = await db.artist.findUnique({ where: { slug }, select: { id: true } });
  if (!artist) return apiError('Artist not found.', 404);
  await db.artistFollow.deleteMany({ where: { userId: user.id, artistId: artist.id } });
  return NextResponse.json({ following: false });
}
