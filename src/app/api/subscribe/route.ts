import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const source = typeof body?.source === 'string' ? body.source : 'landing_cta'

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, error: 'Please enter a valid email address.' },
        { status: 400 },
      )
    }

    // Upsert so resubmits don't fail
    const subscriber = await db.subscriber.upsert({
      where: { email },
      update: { status: 'pending', source },
      create: { email, source, status: 'pending' },
    })

    return NextResponse.json({
      ok: true,
      id: subscriber.id,
      message: "You're on the list. Check your inbox for the activation link.",
    })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json(
      { ok: false, error: 'Something went wrong. Please try again.' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: 'arrowlabs-subscribe' })
}
