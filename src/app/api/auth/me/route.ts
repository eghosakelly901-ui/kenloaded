import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured } from '@/lib/db';

export async function GET() {
  if (!databaseConfigured) return NextResponse.json({ user: null, setupRequired: true });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  const [favorites, followedArtists, recentPlays] = await Promise.all([
    import('@/lib/db').then(({ db }) => db.favorite.findMany({ where: { userId: user.id }, include: { song: { select: { id: true, title: true, slug: true, artist: { select: { name: true } } } } }, orderBy: { createdAt: 'desc' }, take: 50 })),
    import('@/lib/db').then(({ db }) => db.artistFollow.findMany({ where: { userId: user.id }, include: { artist: { select: { id: true, slug: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 })),
    import('@/lib/db').then(({ db }) => db.play.findMany({ where: { userId: user.id }, include: { song: { select: { id: true, title: true, artist: { select: { name: true } } } } }, orderBy: { playedAt: 'desc' }, take: 20 })),
  ]);
  return NextResponse.json({ user, favorites, followedArtists, recentPlays });
}
