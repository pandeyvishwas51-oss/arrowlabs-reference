// ArrowLabs MCP endpoint — auth via header (Authorization: Bearer al_live_…) or
// ?key= query. Clients whose UI takes only a URL (e.g. Claude's connector) should
// instead use /api/mcp/<al_live_…> (see ../[key]/route.ts). Logic lives in
// src/lib/mcp/server.ts and is shared by both routes.

import { NextRequest, NextResponse } from 'next/server'
import { handleMcp } from '@/lib/mcp/server'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  return handleMcp(req)
}

// Streamable HTTP probes GET for an SSE stream. We are stateless request/response,
// so decline it (clients fall back to POST).
export function GET() {
  return NextResponse.json(
    { server: 'arrowlabs-mcp', transport: 'streamable-http (POST JSON-RPC)', connect: 'Use https://arrowlabs.art/api/mcp/<your-api-key> as the remote MCP URL, or POST here with Authorization: Bearer al_live_…' },
    { status: 200 },
  )
}
