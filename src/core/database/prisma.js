import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

// Override DATABASE_URL with the resolved value from env.js
// This ensures the correct URL is used even if .env has a placeholder
process.env.DATABASE_URL = env.DATABASE_URL;

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: env.DATABASE_URL,
    },
  },
});

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
