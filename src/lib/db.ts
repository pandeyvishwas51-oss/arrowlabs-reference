import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaTuned: boolean | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// SQLite concurrency tuning (critical under load): WAL lets many readers run
// alongside a writer (no more "database is locked" on page loads), busy_timeout
// retries briefly on a write lock instead of erroring, and synchronous=NORMAL
// keeps writes fast + still crash-safe under WAL. Runs once per process.
if (!globalForPrisma.prismaTuned && !process.env.DATABASE_URL?.startsWith('postgres')) {
  globalForPrisma.prismaTuned = true
  // Some PRAGMAs (journal_mode, busy_timeout) RETURN a row, which
  // $executeRawUnsafe rejects on SQLite ("Execute returned results, which is not
  // allowed"). $queryRawUnsafe accepts both returning and non-returning
  // statements, so use it for all of them.
  Promise.resolve()
    .then(() => db.$queryRawUnsafe('PRAGMA journal_mode=WAL;'))
    .then(() => db.$queryRawUnsafe('PRAGMA busy_timeout=8000;'))
    .then(() => db.$queryRawUnsafe('PRAGMA synchronous=NORMAL;'))
    .catch(() => {})
}