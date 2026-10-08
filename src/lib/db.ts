import { PrismaClient } from '@prisma/client';

export const databaseConfigured = Boolean(process.env.DATABASE_URL);
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
