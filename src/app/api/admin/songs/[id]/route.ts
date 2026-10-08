import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/http';
import { getStorage } from '@/lib/storage';

const schema = z.object({ status: z.enum(['APPROVED', 'REJECTED', 'PENDING']).optional(), isFeatured: z.boolean().optional(), isTrending: z.boolean().optional(), isDownloadable: z.boolean().optional(), title: z.string().trim().min(1).max(140).optional(), featuredArtist: z.string().trim().max(140).nullable().optional(), description: z.string().max(4000).optional(), lyrics: z.string().max(30000).optional(), releaseDate: z.string().nullable().optional(), artistId: z.string().optional(), albumId: z.string().nullable().optional(), genreId: z.string().optional() }).refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Provide at least one valid moderation change.', 422);
  const { id } = await context.params;
  const song = await db.song.findUnique({ where: { id } });
  if (!song) return apiError('Song not found.', 404);
  if ((parsed.data.status === 'APPROVED' || parsed.data.isDownloadable === true) && !song.copyrightConfirmed) return apiError('Cannot publish music without a recorded copyright confirmation.', 409);
  if (parsed.data.releaseDate && Number.isNaN(Date.parse(parsed.data.releaseDate))) return apiError('Release date is invalid.', 422);
  if (parsed.data.status === 'APPROVED') {
    try {
      const { bucket, client } = getStorage();
      const [audioHead, sample, artworkHead, artworkSample] = await Promise.all([
        client.send(new HeadObjectCommand({ Bucket: bucket, Key: song.audioKey })),
        client.send(new GetObjectCommand({ Bucket: bucket, Key: song.audioKey, Range: 'bytes=0-15' })),
        song.artworkKey ? client.send(new HeadObjectCommand({ Bucket: bucket, Key: song.artworkKey })) : Promise.resolve(null),
        song.artworkKey ? client.send(new GetObjectCommand({ Bucket: bucket, Key: song.artworkKey, Range: 'bytes=0-15' })) : Promise.resolve(null),
      ]);
      const signature = new Uint8Array(await sample.Body!.transformToByteArray());
      const ascii = (start: number, end: number) => String.fromCharCode(...signature.slice(start, end));
      const mp3 = ascii(0, 3) === 'ID3' || signature[0] === 0xff && (signature[1] & 0xe0) === 0xe0;
      const wav = ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE';
      const m4a = ascii(4, 8) === 'ftyp';
      const valid = song.audioMime === 'audio/mpeg' ? mp3 : song.audioMime === 'audio/wav' || song.audioMime === 'audio/x-wav' ? wav : song.audioMime === 'audio/mp4' || song.audioMime === 'audio/m4a' ? m4a : false;
      if (audioHead.ContentLength !== song.audioSize || !valid) return apiError('The uploaded file does not match the declared audio type or size.', 415);
      if (song.artworkKey) {
        const artworkBytes = new Uint8Array(await artworkSample!.Body!.transformToByteArray());
        const isJpeg = artworkBytes[0] === 0xff && artworkBytes[1] === 0xd8 && artworkBytes[2] === 0xff;
        const isPng = artworkBytes[0] === 0x89 && String.fromCharCode(...artworkBytes.slice(1, 4)) === 'PNG';
        const isWebp = String.fromCharCode(...artworkBytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...artworkBytes.slice(8, 12)) === 'WEBP';
        if (artworkHead?.ContentLength !== song.artworkSize || !(isJpeg || isPng || isWebp)) return apiError('The artwork file does not match a supported image format or size.', 415);
      }
    } catch {
      return apiError('The uploaded audio object is not present in storage.', 409);
    }
  }
  const { releaseDate, ...updates } = parsed.data;
  const updated = await db.song.update({ where: { id }, data: { ...updates, ...(releaseDate !== undefined ? { releaseDate: releaseDate ? new Date(releaseDate) : null } : {}) } });
  return NextResponse.json({ song: updated });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const { id } = await context.params;
  const song = await db.song.findUnique({ where: { id } });
  if (!song) return apiError('Song not found.', 404);
  const { bucket, client } = getStorage();
  await Promise.allSettled([client.send(new DeleteObjectCommand({ Bucket: bucket, Key: song.audioKey })), ...(song.artworkKey ? [client.send(new DeleteObjectCommand({ Bucket: bucket, Key: song.artworkKey }))] : [])]);
  await db.song.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
