import { NextResponse } from 'next/server';
import { databaseConfigured, db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET() {
  if (!databaseConfigured) return NextResponse.json({ genres: [], setupRequired: true });
  const genres = await db.genre.findMany({ where: { songs: { some: { uploadStatus: 'APPROVED' } } }, include: { _count: { select: { songs: true } } }, orderBy: { name: 'asc' } });
  return NextResponse.json({ genres });
}
