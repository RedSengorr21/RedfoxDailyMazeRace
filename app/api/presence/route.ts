import { and, eq, gt, lt, ne, sql } from 'drizzle-orm'
import { NextResponse, type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { mazePresence } from '@/lib/db/schema'
import { COLS, ROWS, isValidPlayerId, isValidRaceDate, sanitizeName } from '@/lib/maze'

const ACTIVE_WINDOW_SECONDS = 10

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { playerId, date, x, y } = body
  if (!isValidPlayerId(playerId)) return NextResponse.json({ error: 'Invalid player' }, { status: 400 })
  if (!isValidRaceDate(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= COLS || y >= ROWS) {
    return NextResponse.json({ error: 'Invalid position' }, { status: 400 })
  }

  const name = sanitizeName(body.name)
  await db
    .insert(mazePresence)
    .values({ playerId, name, runDate: date, x, y })
    .onConflictDoUpdate({
      target: mazePresence.playerId,
      set: { name, runDate: date, x, y, updatedAt: sql`now()` },
    })

  if (Math.random() < 0.05) {
    await db.delete(mazePresence).where(lt(mazePresence.updatedAt, sql`now() - interval '1 hour'`))
  }

  const peers = await db
    .select({ id: mazePresence.playerId, name: mazePresence.name, x: mazePresence.x, y: mazePresence.y })
    .from(mazePresence)
    .where(
      and(
        eq(mazePresence.runDate, date),
        ne(mazePresence.playerId, playerId),
        gt(mazePresence.updatedAt, sql`now() - make_interval(secs => ${ACTIVE_WINDOW_SECONDS})`),
      ),
    )
    .limit(50)

  return NextResponse.json({ peers })
}
