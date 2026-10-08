import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';
import { getStorage } from '@/lib/storage';
import { getSessionUser } from '@/lib/auth';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Downloads are unavailable until the database is configured.', 503);
  const { id } = await context.params;
  const song = await db.song.findFirst({ where: { id, uploadStatus: 'APPROVED', isDownloadable: true, copyrightConfirmed: true } });
  if (!song) return apiError('This track is not available for download.', 404);
  try {
    const { bucket, client } = getStorage();
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: song.audioKey }));
    const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: song.audioKey, ResponseContentDisposition: `attachment; filename="${song.slug}.mp3"` }), { expiresIn: 180 });
    const user = await getSessionUser();
    await db.$transaction([db.download.create({ data: { songId: id, userId: user?.id } }), db.song.update({ where: { id }, data: { downloadCount: { increment: 1 } } })]);
    return NextResponse.json({ url, expiresIn: 180 });
  } catch {
    return apiError('The download is temporarily unavailable.', 503);
  }
}
