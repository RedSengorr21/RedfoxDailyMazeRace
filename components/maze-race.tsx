'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Leaderboard, type LeaderboardRow } from '@/components/leaderboard'
import { COLS, ROWS, formatTime, generateMaze, msUntilLocalMidnight, todayLocal, type Point } from '@/lib/maze'

const CELL = 22
type Dir = 'up' | 'down' | 'left' | 'right'
type Peer = { id: string; name: string; x: number; y: number }

const fetchJson = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

function getPlayerId() {
  let id = localStorage.getItem('maze-anon-id')
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    id = 'anon-' + crypto.randomUUID()
    localStorage.setItem('maze-anon-id', id)
  }
  return id
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
}

export function MazeRace() {
  const [date, setDate] = useState<string | null>(null)
  const [resetIn, setResetIn] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setDate(todayLocal(now))
      setResetIn(formatCountdown(msUntilLocalMidnight(now)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!date) return <p className="small">Loading today&apos;s maze…</p>
  return <MazeGame key={date} date={date} resetIn={resetIn} />
}

function MazeGame({ date, resetIn }: { date: string; resetIn: string }) {
  const maze = useMemo(() => generateMaze(date), [date])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef<Point>({ ...maze.start })
  const startTimeRef = useRef(0)
  const [pos, setPos] = useState<Point>({ ...maze.start })
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [finishedMs, setFinishedMs] = useState<number | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [nameDraft, setNameDraft] = useState('')

  useEffect(() => {
    setPlayerId(getPlayerId())
    const saved = localStorage.getItem('maze-name') || ''
    setName(saved)
    setNameDraft(saved)
  }, [])

  const lbKey = playerId ? `/api/runs?date=${date}&playerId=${encodeURIComponent(playerId)}` : null
  const { data: lb, error: lbError, isLoading: lbLoading, mutate: mutateLb } = useSWR<{
    top: LeaderboardRow[]
    mine: { timeMs: number } | null
  }>(lbKey, fetchJson, { refreshInterval: 5000 })

  const alreadyDone = finishedMs === null && !!lb?.mine
  const locked = finishedMs !== null || alreadyDone

  const { data: presence } = useSWR<{ peers: Peer[] }>(
    playerId ? ['presence', playerId, date] : null,
    async () => {
      const res = await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name: name || 'Racer', date, ...posRef.current }),
      })
      if (!res.ok) throw new Error('Presence failed')
      return res.json()
    },
    { refreshInterval: 2000, revalidateOnFocus: true, keepPreviousData: true },
  )
  const peers = presence?.peers ?? []

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const styles = getComputedStyle(document.documentElement)
    const color = (v: string) => styles.getPropertyValue(v).trim()

    ctx.fillStyle = color('--panel')
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = color('--accent')
    ctx.globalAlpha = 0.7
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const c = maze.grid[y][x]
        const px = x * CELL + 1
        const py = y * CELL + 1
        if (c.N) { ctx.moveTo(px, py); ctx.lineTo(px + CELL, py) }
        if (c.W) { ctx.moveTo(px, py); ctx.lineTo(px, py + CELL) }
        if (y === ROWS - 1 && c.S) { ctx.moveTo(px, py + CELL); ctx.lineTo(px + CELL, py + CELL) }
        if (x === COLS - 1 && c.E) { ctx.moveTo(px + CELL, py); ctx.lineTo(px + CELL, py + CELL) }
      }
    }
    ctx.stroke()
    ctx.globalAlpha = 1

    ctx.fillStyle = color('--accent2')
    ctx.fillRect(maze.exit.x * CELL + 5, maze.exit.y * CELL + 5, CELL - 8, CELL - 8)

    ctx.fillStyle = color('--peer')
    for (const p of peers) {
      ctx.beginPath()
      ctx.arc(p.x * CELL + CELL / 2 + 1, p.y * CELL + CELL / 2 + 1, 5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.fillStyle = color('--accent')
    ctx.beginPath()
    ctx.arc(pos.x * CELL + CELL / 2 + 1, pos.y * CELL + CELL / 2 + 1, 6, 0, Math.PI * 2)
    ctx.fill()
  }, [maze, pos, peers])

  useEffect(() => {
    if (!started || finishedMs !== null) return
    const id = setInterval(() => setElapsed(performance.now() - startTimeRef.current), 100)
    return () => clearInterval(id)
  }, [started, finishedMs])

  const submitScore = useCallback(
    async (timeMs: number) => {
      setSubmitError(null)
      try {
        const res = await fetch('/api/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, name: name || 'Racer', date, timeMs }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          setSubmitError(body.error || 'Could not save your score.')
        }
      } catch {
        setSubmitError('Could not save your score.')
      }
      mutateLb()
    },
    [playerId, name, date, mutateLb],
  )

  const tryMove = useCallback(
    (dir: Dir) => {
      if (locked || !playerId) return
      const cur = posRef.current
      const c = maze.grid[cur.y][cur.x]
      let { x, y } = cur
      if (dir === 'up' && !c.N) y--
      else if (dir === 'down' && !c.S) y++
      else if (dir === 'left' && !c.W) x--
      else if (dir === 'right' && !c.E) x++
      else return

      if (!started) {
        startTimeRef.current = performance.now()
        setStarted(true)
      }
      posRef.current = { x, y }
      setPos({ x, y })

      if (x === maze.exit.x && y === maze.exit.y) {
        const total = Math.round(performance.now() - startTimeRef.current)
        setElapsed(total)
        setFinishedMs(total)
        submitScore(total)
      }
    },
    [locked, playerId, maze, started, submitScore],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const map: Record<string, Dir> = {
        arrowup: 'up', w: 'up', arrowdown: 'down', s: 'down',
        arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right',
      }
      const dir = map[e.key.toLowerCase()]
      if (dir) {
        e.preventDefault()
        tryMove(dir)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [tryMove])

  const saveName = () => {
    const next = nameDraft.trim().slice(0, 16) || 'Racer'
    setName(next)
    setNameDraft(next)
    localStorage.setItem('maze-name', next)
  }

  const onlineCount = peers.length + 1

  return (
    <div className="wrap">
      <section className="gamecol" aria-label="Maze">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault()
            saveName()
          }}
        >
          <label htmlFor="nameInput" className="small">Name:</label>
          <input
            id="nameInput"
            type="text"
            maxLength={16}
            placeholder="Racer name"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
          />
          <button className="btn" type="submit">Save</button>
          {playerId && (
            <span className="small online">
              <span className="dot" aria-hidden="true" />
              {onlineCount} {onlineCount === 1 ? 'racer' : 'racers'} online
            </span>
          )}
        </form>

        <div className="hud">
          <span>
            Time: <b>{formatTime(finishedMs ?? (alreadyDone ? lb!.mine!.timeMs : elapsed))}</b>
          </span>
          <span>{date}</span>
        </div>

        <div className="mazebox">
          <canvas
            ref={canvasRef}
            width={COLS * CELL + 2}
            height={ROWS * CELL + 2}
            role="img"
            aria-label="Today's maze. Your position is the teal dot, the exit is the pink square."
          />
        </div>

        <div className="pad" role="group" aria-label="Movement controls">
          <span />
          <button type="button" aria-label="Up" disabled={locked} onClick={() => tryMove('up')}>↑</button>
          <span />
          <button type="button" aria-label="Left" disabled={locked} onClick={() => tryMove('left')}>←</button>
          <span />
          <button type="button" aria-label="Right" disabled={locked} onClick={() => tryMove('right')}>→</button>
          <span />
          <button type="button" aria-label="Down" disabled={locked} onClick={() => tryMove('down')}>↓</button>
          <span />
        </div>
        <p className="small">Arrow keys / WASD also work. The timer starts on your first move.</p>

        {finishedMs !== null && (
          <div className="done" role="status">
            You reached the exit in <b>{formatTime(finishedMs)}</b>! Come back tomorrow for a new maze.
            {submitError && <p className="small">{submitError}</p>}
          </div>
        )}
        {alreadyDone && (
          <div className="done" role="status">
            {"You already ran today's maze in "}
            <b>{formatTime(lb!.mine!.timeMs)}</b>. New maze tomorrow!
          </div>
        )}
      </section>

      <Leaderboard rows={lb?.top} loading={!playerId || lbLoading} error={!!lbError} playerId={playerId} resetIn={resetIn} />
    </div>
  )
}
