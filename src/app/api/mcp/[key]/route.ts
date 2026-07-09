// ArrowLabs MCP endpoint with the API key in the URL path:
//   https://arrowlabs.art/api/mcp/al_live_xxxxxxxx
// This is the URL to paste into Claude's custom-connector "Remote MCP server URL"
// field (its UI accepts only a URL — no headers/OAuth), and works for any MCP
// client that can't send custom auth headers.

import { NextRequest, NextResponse } from 'next/server'
import { handleMcp } from '@/lib/mcp/server'

export const maxDuration = 300

export async function POST(req: NextRequest, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params
  return handleMcp(req, key)
}

export function GET() {
  return NextResponse.json({ server: 'arrowlabs-mcp', transport: 'streamable-http (POST JSON-RPC)', note: 'POST JSON-RPC here. This URL carries your API key.' }, { status: 200 })
}
