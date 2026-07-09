// API keys - issue, hash, verify, revoke. The raw key is shown exactly once at
// creation; only a SHA-256 hash is stored. Format: al_live_<32 hex>.

import { createHash, randomBytes } from 'crypto'
import { db } from '@/lib/db'

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export function generateRawKey(): { raw: string; prefix: string; hashed: string } {
  const secret = randomBytes(24).toString('hex')
  const raw = `al_live_${secret}`
  const prefix = raw.slice(0, 12) // e.g. al_live_ab12
  return { raw, prefix, hashed: sha256(raw) }
}

export async function createApiKey(userId: string, name: string) {
  const { raw, prefix, hashed } = generateRawKey()
  const record = await db.apiKey.create({
    data: { userId, name, prefix, hashedKey: hashed },
  })
  // raw is returned once and never stored.
  return { id: record.id, name: record.name, prefix, raw, createdAt: record.createdAt }
}

export async function listApiKeys(userId: string) {
  return db.apiKey.findMany({
    where: { userId, revoked: false },
    select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function revokeApiKey(userId: string, id: string) {
  return db.apiKey.updateMany({ where: { id, userId }, data: { revoked: true } })
}

// Verify a raw key from an Authorization header. Returns the owning userId.
export async function verifyApiKey(raw: string): Promise<{ userId: string; keyId: string } | null> {
  if (!raw || !raw.startsWith('al_live_')) return null
  const hashed = sha256(raw)
  const record = await db.apiKey.findUnique({ where: { hashedKey: hashed } })
  if (!record || record.revoked) return null
  await db.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
  return { userId: record.userId, keyId: record.id }
}

// Pull a bearer/x-api-key credential out of a request.
export function extractApiKey(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim()
  const x = req.headers.get('x-api-key')
  return x?.trim() || null
}
