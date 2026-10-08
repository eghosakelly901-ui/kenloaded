import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, slugify } from '@/lib/http';

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('artist'), name: z.string().trim().min(1).max(100), bio: z.string().max(4000).optional(), imageKey: z.string().max(500).optional(), socials: z.record(z.string(), z.url().max(500)).optional() }),
  z.object({ kind: z.literal('genre'), name: z.string().trim().min(1).max(60) }),
  z.object({ kind: z.literal('album'), title: z.string().trim().min(1).max(140), artistId: z.string().min(1), releaseDate: z.string().optional() }),
]);

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Provide valid catalog details.', 422);
  const data = parsed.data;
  if (data.kind === 'artist') {
    const artist = await db.artist.create({ data: { name: data.name, slug: slugify(data.name), bio: data.bio, imageKey: data.imageKey, socials: data.socials } });
    return NextResponse.json({ artist }, { status: 201 });
  }
  if (data.kind === 'genre') {
    const genre = await db.genre.create({ data: { name: data.name, slug: slugify(data.name) } });
    return NextResponse.json({ genre }, { status: 201 });
  }
  if (data.releaseDate && Number.isNaN(Date.parse(data.releaseDate))) return apiError('Release date is invalid.', 422);
  const album = await db.album.create({ data: { title: data.title, artistId: data.artistId, releaseDate: data.releaseDate ? new Date(data.releaseDate) : null } });
  return NextResponse.json({ album }, { status: 201 });
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const kind = request.nextUrl.searchParams.get('kind');
  if (kind === 'artists') return NextResponse.json({ items: await db.artist.findMany({ include: { _count: { select: { songs: true, albums: true, followers: true } } }, orderBy: { name: 'asc' }, take: 300 }) });
  if (kind === 'albums') return NextResponse.json({ items: await db.album.findMany({ include: { artist: { select: { name: true } }, _count: { select: { songs: true } } }, orderBy: { title: 'asc' }, take: 300 }) });
  if (kind === 'genres') return NextResponse.json({ items: await db.genre.findMany({ include: { _count: { select: { songs: true } } }, orderBy: { name: 'asc' } }) });
  return apiError('Choose artists, albums or genres.', 422);
}