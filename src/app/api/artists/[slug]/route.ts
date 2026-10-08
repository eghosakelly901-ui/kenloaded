import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { databaseConfigured } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!databaseConfigured) return NextResponse.json({ artist: null, following: false, setupRequired: true });
  const { slug } = await context.params;
  const artist = await db.artist.findUnique({
    where: { slug },
    include: {
      songs: {
        where: { uploadStatus: 'APPROVED' },
        include: { album: { select: { title: true } }, genre: { select: { name: true } } },
        orderBy: [{ isFeatured: 'desc' }, { releaseDate: 'desc' }],
      },
      albums: true,
      _count: { select: { followers: true } },
    },
  });
  if (!artist) return apiError('Artist not found.', 404);
  const user = await getSessionUser();
  const following = user ? Boolean(await db.artistFollow.findUnique({ where: { userId_artistId: { userId: user.id, artistId: artist.id } } })) : false;
  return NextResponse.json({ artist, following });
}
