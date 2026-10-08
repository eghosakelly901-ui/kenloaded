import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return NextResponse.json({ album: null, setupRequired: true });
  const { id } = await context.params;
  const album = await db.album.findFirst({ where: { OR: [{ id }, { title: { equals: id.replaceAll('-', ' '), mode: 'insensitive' } }] }, include: { artist: true, songs: { where: { uploadStatus: 'APPROVED' }, include: { genre: true }, orderBy: { releaseDate: 'asc' } } } });
  if (!album) return apiError('Album not found.', 404);
  return NextResponse.json({ album });
}
