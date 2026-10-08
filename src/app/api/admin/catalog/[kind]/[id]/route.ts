import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, slugify } from '@/lib/http';

const artistSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), bio: z.string().max(4000).optional(), imageKey: z.string().max(500).nullable().optional(), socials: z.record(z.string(), z.url().max(500)).nullable().optional() }).refine((value) => Object.keys(value).length > 0);
const albumSchema = z.object({ title: z.string().trim().min(1).max(140).optional(), artworkKey: z.string().max(500).nullable().optional(), releaseDate: z.string().nullable().optional() }).refine((value) => Object.keys(value).length > 0);
const genreSchema = z.object({ name: z.string().trim().min(1).max(60) });

export async function PATCH(request: NextRequest, context: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const { kind, id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  if (kind === 'artists') {
    const parsed = artistSchema.safeParse(body);
    if (!parsed.success) return apiError('Provide valid artist profile changes.', 422);
    const { socials, ...fields } = parsed.data;
    const data = {
      ...fields,
      ...(fields.name ? { slug: slugify(fields.name) } : {}),
      ...(socials === null ? { socials: Prisma.JsonNull } : socials ? { socials: socials as Prisma.InputJsonObject } : {}),
    };
    return NextResponse.json({ artist: await db.artist.update({ where: { id }, data }) });
  }
  if (kind === 'albums') {
    const parsed = albumSchema.safeParse(body);
    if (!parsed.success) return apiError('Provide valid album changes.', 422);
    if (parsed.data.releaseDate && Number.isNaN(Date.parse(parsed.data.releaseDate))) return apiError('Release date is invalid.', 422);
    const data = { ...parsed.data, releaseDate: parsed.data.releaseDate ? new Date(parsed.data.releaseDate) : parsed.data.releaseDate };
    return NextResponse.json({ album: await db.album.update({ where: { id }, data }) });
  }
  if (kind === 'genres') {
    const parsed = genreSchema.safeParse(body);
    if (!parsed.success) return apiError('Provide a valid genre name.', 422);
    return NextResponse.json({ genre: await db.genre.update({ where: { id }, data: { name: parsed.data.name, slug: slugify(parsed.data.name) } }) });
  }
  return apiError('Unknown catalog type.', 404);
}

export async function DELETE(_request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const { kind, id } = await context.params;
  if (kind === 'artists') {
    const hasSongs = await db.song.count({ where: { artistId: id } });
    if (hasSongs) return apiError('Reassign or delete this artist’s songs before deleting the artist.', 409);
    await db.artist.delete({ where: { id } });
  } else if (kind === 'albums') {
    await db.album.update({ where: { id }, data: { artworkKey: null } });
    await db.album.delete({ where: { id } });
  } else if (kind === 'genres') {
    const hasSongs = await db.song.count({ where: { genreId: id } });
    if (hasSongs) return apiError('Reassign this genre’s songs before deleting the genre.', 409);
    await db.genre.delete({ where: { id } });
  } else return apiError('Unknown catalog type.', 404);
  return NextResponse.json({ ok: true });
}