import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

const addSchema = z.object({ songId: z.string().min(1) });
const reorderSchema = z.object({ songIds: z.array(z.string().min(1)).max(500) });
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to update playlists.', 401);
  const { id } = await context.params;
  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Choose a track to add.', 422);
  const playlist = await db.playlist.findFirst({ where: { id, userId: user.id } });
  if (!playlist) return apiError('Playlist not found.', 404);
  const song = await db.song.findFirst({ where: { id: parsed.data.songId, uploadStatus: 'APPROVED' }, select: { id: true } });
  if (!song) return apiError('Song not found.', 404);
  const position = await db.playlistSong.count({ where: { playlistId: id } });
  await db.playlistSong.create({ data: { playlistId: id, songId: song.id, position } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to reorder playlists.', 401);
  const { id } = await context.params;
  const parsed = reorderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError('Invalid playlist order.', 422);
  const playlist = await db.playlist.findFirst({ where: { id, userId: user.id }, include: { songs: { select: { songId: true } } } });
  if (!playlist) return apiError('Playlist not found.', 404);
  if (parsed.data.songIds.length !== playlist.songs.length || parsed.data.songIds.some((songId) => !playlist.songs.some((entry) => entry.songId === songId))) return apiError('The new order must contain every playlist song once.', 422);
  await db.$transaction(async (transaction) => {
    await transaction.playlistSong.updateMany({ where: { playlistId: id }, data: { position: { increment: parsed.data.songIds.length } } });
    for (const [position, songId] of parsed.data.songIds.entries()) {
      await transaction.playlistSong.update({ where: { playlistId_songId: { playlistId: id, songId } }, data: { position } });
    }
  });
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!databaseConfigured) return apiError('Playlists are unavailable until the database is configured.', 503);
  const user = await getSessionUser();
  if (!user) return apiError('Sign in to update playlists.', 401);
  const { id } = await context.params;
  const songId = request.nextUrl.searchParams.get('songId');
  if (!songId) return apiError('Provide a songId.', 422);
  const ownsPlaylist = await db.playlist.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!ownsPlaylist) return apiError('Playlist not found.', 404);
  await db.playlistSong.deleteMany({ where: { playlistId: id, songId } });
  return NextResponse.json({ ok: true });
}
