import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();
const genres = ['Afrobeats', 'Hip-Hop', 'R&B', 'Gospel', 'Amapiano', 'Pop', 'Reggae', 'Dancehall'];

async function main() {
  for (const name of genres) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await db.genre.upsert({ where: { slug }, update: {}, create: { name, slug } });
  }
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_ADMIN_NAME ?? 'Platform Admin';
  if (email && password) {
    if (password.length < 16) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 16 characters.');
    await db.user.upsert({ where: { email }, update: { role: 'ADMIN', name }, create: { email, name, passwordHash: await hash(password, 12), role: 'ADMIN' } });
    console.log(`Admin account ready: ${email}`);
  } else {
    console.log('No bootstrap admin created. Set BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD and optionally BOOTSTRAP_ADMIN_NAME before seeding.');
  }
}

main().finally(() => db.$disconnect());
