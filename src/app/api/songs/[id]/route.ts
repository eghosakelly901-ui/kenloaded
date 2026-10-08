import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { databaseConfigured } from '@/lib/db';
import { apiError } from '@/lib/http';
import { getStorage } from '@/lib/storage';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return NextResponse.json({ song: null, related: [], setupRequired: true });
  const { id } = await context.params;
  const song = await db.song.findFirst({ where: { OR: [{ id }, { slug: id }], uploadStatus: 'APPROVED' }, include: { artist: true, album: true, genre: true } });
  if (!song) return apiError('Song not found.', 404);
  const { bucket, client } = getStorage();
  const audioUrl = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: song.audioKey }), { expiresIn: 900 });
  const artworkUrl = song.artworkKey ? await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: song.artworkKey }), { expiresIn: 900 }) : null;
  const related = await db.song.findMany({ where: { artistId: song.artistId, id: { not: song.id }, uploadStatus: 'APPROVED' }, take: 8, select: { id: true, title: true, slug: true } });
  return NextResponse.json({ song: { ...song, audioUrl, artworkUrl }, related });
}
