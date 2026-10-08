import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const [songs, artists, users, downloads, plays, pending, topSongs, recent] = await Promise.all([
    db.song.count({ where: { uploadStatus: 'APPROVED' } }), db.artist.count(), db.user.count(), db.download.count(), db.play.count(),
    db.song.count({ where: { uploadStatus: 'PENDING' } }),
    db.song.findMany({ where: { uploadStatus: 'APPROVED' }, orderBy: { downloadCount: 'desc' }, take: 5, select: { title: true, downloadCount: true, playCount: true, artist: { select: { name: true } } } }),
    db.song.findMany({ orderBy: { createdAt: 'desc' }, take: 8, select: { id: true, title: true, uploadStatus: true, createdAt: true, artist: { select: { name: true } } } }),
  ]);
  return NextResponse.json({ totals: { songs, artists, users, downloads, plays, pending }, topSongs, recent });
}
