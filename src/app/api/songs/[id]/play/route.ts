import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playback analytics are unavailable until the database is configured.', 503);
  const { id } = await context.params;
  const song = await db.song.findFirst({ where: { id, uploadStatus: 'APPROVED' }, select: { id: true } });
  if (!song) return apiError('Song not found.', 404);
  const user = await getSessionUser();
  await db.$transaction([db.play.create({ data: { songId: id, userId: user?.id } }), db.song.update({ where: { id }, data: { playCount: { increment: 1 } } })]);
  return NextResponse.json({ ok: true });
}
