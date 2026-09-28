import { PrismaClient } from '@prisma/client';

const globalForPrisma = (typeof globalThis !== 'undefined' ? globalThis : global) as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

globalForPrisma.prisma = prisma;
