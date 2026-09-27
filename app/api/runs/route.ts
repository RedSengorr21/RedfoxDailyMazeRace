import { and, asc, eq } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { mazeRuns } from '@/lib/db/schema'
import { isValidPlayerId, isValidRaceDate, sanitizeName } from '@/lib/maze'

const MIN_TIME_MS = 2000
const MAX_TIME_MS = 60 * 60 * 1000

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  const playerId = req.nextUrl.searchParams.get('playerId')
  if (!isValidRaceDate(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })

  const top = await db
    .select({ playerId: mazeRuns.playerId, name: mazeRuns.name, timeMs: mazeRuns.timeMs })
    .from(mazeRuns)
    .where(eq(mazeRuns.runDate, date))
    .orderBy(asc(mazeRuns.timeMs), asc(mazeRuns.createdAt))
    .limit(20)

  let mine: { timeMs: number } | null = null
  if (isValidPlayerId(playerId)) {
    const rows = await db
      .select({ timeMs: mazeRuns.timeMs })
      .from(mazeRuns)
      .where(and(eq(mazeRuns.runDate, date), eq(mazeRuns.playerId, playerId)))
      .limit(1)
    mine = rows[0] ?? null
  }

  return NextResponse.json({ top, mine })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { playerId, date, timeMs } = body
  if (!isValidPlayerId(playerId)) return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
  if (!isValidRaceDate(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  if (!Number.isInteger(timeMs) || timeMs < MIN_TIME_MS || timeMs > MAX_TIME_MS) {
    return NextResponse.json({ error: 'Invalid time' }, { status: 400 })
  }

  const inserted = await db
    .insert(mazeRuns)
    .values({ playerId, name: sanitizeName(body.name), runDate: date, timeMs })
    .onConflictDoNothing({ target: [mazeRuns.runDate, mazeRuns.playerId] })
    .returning({ timeMs: mazeRuns.timeMs })

  if (!inserted.length) {
    return NextResponse.json({ error: 'You already ran today' }, { status: 409 })
  }
  return NextResponse.json({ ok: true, timeMs: inserted[0].timeMs })
}
