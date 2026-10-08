import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { databaseConfigured } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!databaseConfigured) return apiError('Favorites are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to view favorites.', 401);
  const favorites = await db.favorite.findMany({ where: { userId: user.id }, include: { song: { include: { artist: { select: { name: true } }, album: { select: { title: true } }, genre: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ favorites });
}
