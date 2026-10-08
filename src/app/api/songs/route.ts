import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError, slugify } from '@/lib/http';
import { getStorage } from '@/lib/storage';

const allowedAudio = new Set(['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a']);
const allowedArtwork = new Set(['image/jpeg', 'image/png', 'image/webp']);
const schema = z.object({ title: z.string().trim().min(1).max(140), artist: z.string().trim().min(1).max(100), featuredArtist: z.string().trim().max(140).optional(), album: z.string().trim().max(140).optional(), genre: z.string().trim().min(1).max(60), releaseDate: z.string().optional(), description: z.string().max(4000).optional(), lyrics: z.string().max(30000).optional(), socialLinks: z.record(z.string(), z.url().max(500)).optional(), audioMime: z.string(), audioSize: z.number().int().positive().max(50 * 1024 * 1024), artworkMime: z.string().optional(), artworkSize: z.number().int().positive().max(8 * 1024 * 1024).optional(), downloadable: z.boolean().default(false), copyrightConfirmed: z.literal(true) }).refine((data) => !data.releaseDate || !Number.isNaN(Date.parse(data.releaseDate)), { message: 'Release date is invalid.', path: ['releaseDate'] });

export async function GET(request: NextRequest) {
  if (!databaseConfigured) return NextResponse.json({ songs: [], setupRequired: true });
  const query = request.nextUrl.searchParams.get('q')?.trim();
  const genre = request.nextUrl.searchParams.get('genre');
  const sort = request.nextUrl.searchParams.get('sort');
  const songs = await db.song.findMany({
    where: { uploadStatus: 'APPROVED', ...(genre ? { genre: { slug: genre } } : {}), ...(query ? { OR: [{ title: { contains: query, mode: 'insensitive' } }, { artist: { name: { contains: query, mode: 'insensitive' } } }, { album: { title: { contains: query, mode: 'insensitive' } } }, { genre: { name: { contains: query, mode: 'insensitive' } } }] } : {}) },
    include: { artist: { select: { id: true, name: true, slug: true } }, album: { select: { title: true } }, genre: { select: { name: true, slug: true } } },
    orderBy: sort === 'played' ? { playCount: 'desc' } : sort === 'downloaded' ? { downloadCount: 'desc' } : sort === 'az' ? { title: 'asc' } : [{ isTrending: 'desc' }, { releaseDate: 'desc' }, { createdAt: 'desc' }],
    take: 100,
  });
  const { bucket, client } = getStorage();
  const hydrated = await Promise.all(songs.map(async (song) => ({ ...song, audioUrl: await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: song.audioKey }), { expiresIn: 900 }), artworkUrl: song.artworkKey ? await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: song.artworkKey }), { expiresIn: 900 }) : null })));
  return NextResponse.json({ songs: hydrated });
}

export async function POST(request: NextRequest) {
  if (!databaseConfigured) return apiError('Music submissions are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in before submitting music.', 401);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Check the upload details and confirm you have distribution rights.', 422);
  if (!allowedAudio.has(parsed.data.audioMime)) return apiError('Audio must be MP3, WAV or M4A.', 415);
  if (parsed.data.artworkMime && !allowedArtwork.has(parsed.data.artworkMime)) return apiError('Artwork must be JPEG, PNG or WebP.', 415);
  if (Boolean(parsed.data.artworkMime) !== Boolean(parsed.data.artworkSize)) return apiError('Provide both artwork type and size.', 422);

  const storage = getStorage();
  const artistSlug = slugify(parsed.data.artist);
  const artist = await db.artist.upsert({ where: { slug: artistSlug }, update: {}, create: { name: parsed.data.artist, slug: artistSlug } });
  const genreSlug = slugify(parsed.data.genre);
  const genre = await db.genre.upsert({ where: { slug: genreSlug }, update: {}, create: { name: parsed.data.genre, slug: genreSlug } });
  const album = parsed.data.album ? await db.album.upsert({ where: { artistId_title: { artistId: artist.id, title: parsed.data.album } }, update: {}, create: { artistId: artist.id, title: parsed.data.album } }) : null;
  const audioKey = `pending/${user.id}/${randomUUID()}.${parsed.data.audioMime === 'audio/mpeg' ? 'mp3' : parsed.data.audioMime === 'audio/mp4' || parsed.data.audioMime === 'audio/m4a' ? 'm4a' : 'wav'}`;
  const artworkKey = parsed.data.artworkMime ? `artwork/${artist.id}/${randomUUID()}.${parsed.data.artworkMime.split('/')[1].replace('jpeg', 'jpg')}` : null;
  const created = await db.song.create({ data: { title: parsed.data.title, slug: `${slugify(parsed.data.title)}-${randomUUID().slice(0, 8)}`, featuredArtist: parsed.data.featuredArtist || null, description: parsed.data.description || '', lyrics: parsed.data.lyrics || '', socialLinks: parsed.data.socialLinks, artistId: artist.id, albumId: album?.id, genreId: genre.id, uploaderId: user.id, audioKey, artworkKey, audioMime: parsed.data.audioMime, audioSize: parsed.data.audioSize, artworkSize: parsed.data.artworkSize, uploadStatus: 'PENDING', isDownloadable: parsed.data.downloadable, copyrightConfirmed: true, releaseDate: parsed.data.releaseDate ? new Date(parsed.data.releaseDate) : null } });
  const audioUploadUrl = await getSignedUrl(storage.client, new PutObjectCommand({ Bucket: storage.bucket, Key: audioKey, ContentType: parsed.data.audioMime, ContentLength: parsed.data.audioSize }), { expiresIn: 600 });
  const artworkUploadUrl = artworkKey && parsed.data.artworkMime && parsed.data.artworkSize ? await getSignedUrl(storage.client, new PutObjectCommand({ Bucket: storage.bucket, Key: artworkKey, ContentType: parsed.data.artworkMime, ContentLength: parsed.data.artworkSize }), { expiresIn: 600 }) : null;
  return NextResponse.json({ songId: created.id, status: created.uploadStatus, audioUploadUrl, artworkUploadUrl, requiredHeaders: { 'Content-Type': parsed.data.audioMime } }, { status: 201 });
}
