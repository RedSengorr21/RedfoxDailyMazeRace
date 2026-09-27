export const COLS = 21
export const ROWS = 21

export type Cell = { N: boolean; E: boolean; S: boolean; W: boolean }
export type Point = { x: number; y: number }
export type Maze = { grid: Cell[][]; start: Point; exit: Point }

export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

export function isValidRaceDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return value === todayUtc(now) || value === todayUtc(yesterday)
}

function hashSeed(s: string) {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Must stay identical to the original generator so every player gets the same maze for a given day.
export function generateMaze(dateStr: string): Maze {
  const rand = mulberry32(hashSeed('maze-' + dateStr)())
  const grid: (Cell & { v: boolean })[][] = []
  for (let y = 0; y < ROWS; y++) {
    const row: (Cell & { v: boolean })[] = []
    for (let x = 0; x < COLS; x++) row.push({ N: true, E: true, S: true, W: true, v: false })
    grid.push(row)
  }
  const dirs: ['N' | 'E' | 'S' | 'W', number, number, 'N' | 'E' | 'S' | 'W'][] = [
    ['N', 0, -1, 'S'],
    ['E', 1, 0, 'W'],
    ['S', 0, 1, 'N'],
    ['W', -1, 0, 'E'],
  ]
  const stack: Point[] = [{ x: 0, y: 0 }]
  grid[0][0].v = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const opts = dirs.filter(([, dx, dy]) => {
      const nx = cur.x + dx
      const ny = cur.y + dy
      return nx >= 0 && ny >= 0 && nx < COLS && ny < ROWS && !grid[ny][nx].v
    })
    if (!opts.length) {
      stack.pop()
      continue
    }
    const [dir, dx, dy, opp] = opts[Math.floor(rand() * opts.length)]
    grid[cur.y][cur.x][dir] = false
    const nx = cur.x + dx
    const ny = cur.y + dy
    grid[ny][nx][opp] = false
    grid[ny][nx].v = true
    stack.push({ x: nx, y: ny })
  }
  const start = { x: 0, y: 0 }
  let exit: Point
  do {
    exit = { x: Math.floor(rand() * COLS), y: Math.floor(rand() * ROWS) }
  } while (Math.abs(exit.x - start.x) + Math.abs(exit.y - start.y) < (COLS + ROWS) / 2)
  return { grid, start, exit }
}

export function formatTime(ms: number) {
  return (ms / 1000).toFixed(1) + 's'
}

export function sanitizeName(value: unknown) {
  if (typeof value !== 'string') return 'Racer'
  const cleaned = value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16)
  return cleaned || 'Racer'
}

export function isValidPlayerId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(value)
}
