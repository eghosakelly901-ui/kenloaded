import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError } from '@/lib/http';

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return apiError('Administrator access required.', 403);
  const status = request.nextUrl.searchParams.get('status');
  const allowed = ['PENDING', 'APPROVED', 'REJECTED'];
  const songs = await db.song.findMany({ where: status && allowed.includes(status) ? { uploadStatus: status as 'PENDING' | 'APPROVED' | 'REJECTED' } : {}, include: { artist: true, genre: true, album: true, uploader: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 300 });
  return NextResponse.json({ songs });
}
