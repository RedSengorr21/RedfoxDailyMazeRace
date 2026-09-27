import { formatTime } from '@/lib/maze'

export type LeaderboardRow = { playerId: string; name: string; timeMs: number }

export function Leaderboard({
  rows,
  loading,
  error,
  playerId,
}: {
  rows: LeaderboardRow[] | undefined
  loading: boolean
  error: boolean
  playerId: string | null
}) {
  return (
    <aside className="side" aria-labelledby="lb-title">
      <h2 id="lb-title">{"Today's leaderboard"}</h2>
      <ol className="lb" aria-live="polite">
        {error ? (
          <li>Leaderboard unavailable right now.</li>
        ) : loading || !rows ? (
          <li>Loading…</li>
        ) : rows.length === 0 ? (
          <li>No finishers yet today — be the first!</li>
        ) : (
          rows.map((r, i) => (
            <li key={r.playerId} className={r.playerId === playerId ? 'me' : undefined}>
              <span>
                {i + 1}. {r.name}
              </span>
              <span>{formatTime(r.timeMs)}</span>
            </li>
          ))
        )}
      </ol>
      <p className="small">Resets daily at 00:00 UTC.</p>
    </aside>
  )
}
