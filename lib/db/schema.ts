import { date, integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const mazeRuns = pgTable(
  'maze_runs',
  {
    id: serial('id').primaryKey(),
    playerId: text('player_id').notNull(),
    name: text('name').notNull(),
    runDate: date('run_date').notNull(),
    timeMs: integer('time_ms').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.runDate, t.playerId)],
)

export const mazePresence = pgTable('maze_presence', {
  playerId: text('player_id').primaryKey(),
  name: text('name').notNull(),
  runDate: date('run_date').notNull(),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
