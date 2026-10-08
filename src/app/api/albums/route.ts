import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!databaseConfigured) return NextResponse.json({ albums: [], setupRequired: true });
  const albums = await db.album.findMany({ where: { songs: { some: { uploadStatus: 'APPROVED' } } }, include: { artist: { select: { name: true, slug: true } }, songs: { where: { uploadStatus: 'APPROVED' }, select: { id: true, title: true, slug: true } } }, orderBy: { releaseDate: 'desc' }, take: 200 });
  return NextResponse.json({ albums: albums.map((album) => ({ ...album, artworkUrl: album.artworkKey && process.env.S3_PUBLIC_BASE_URL ? `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${album.artworkKey.split('/').map(encodeURIComponent).join('/')}` : null })) });
}
