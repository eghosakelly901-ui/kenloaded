import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!databaseConfigured) return NextResponse.json({ artists: [], setupRequired: true });
  const artists = await db.artist.findMany({ where: { songs: { some: { uploadStatus: 'APPROVED' } } }, include: { songs: { where: { uploadStatus: 'APPROVED' }, take: 1, include: { genre: { select: { name: true } } } }, _count: { select: { songs: true, albums: true, followers: true } } }, orderBy: { name: 'asc' }, take: 200 });
  return NextResponse.json({ artists: artists.map((artist) => ({ ...artist, artworkUrl: artist.imageKey && process.env.S3_PUBLIC_BASE_URL ? `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${artist.imageKey.split('/').map(encodeURIComponent).join('/')}` : null })) });
}
