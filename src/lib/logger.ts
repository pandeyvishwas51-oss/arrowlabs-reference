// Structured error logging - writes to logs/error.log with timestamp + stack.
// Best-effort: never throws (logging must not break the request path).

import { promises as fs } from 'fs'
import path from 'path'

const LOG_DIR = path.join(process.cwd(), 'logs')
const ERROR_LOG = path.join(LOG_DIR, 'error.log')

export async function logError(context: string, error: unknown, meta?: Record<string, any>) {
  const err = error instanceof Error ? error : new Error(String(error))
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    context,
    message: err.message,
    stack: err.stack,
    meta,
  })
  // Always mirror to stderr for terminal visibility.
  console.error(`[error] ${context}: ${err.message}`)
  try {
    await fs.mkdir(LOG_DIR, { recursive: true })
    await fs.appendFile(ERROR_LOG, line + '\n')
  } catch {
    /* swallow - logging failures must not cascade */
  }
}
