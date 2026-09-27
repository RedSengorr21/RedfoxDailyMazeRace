import { MazeRace } from '@/components/maze-race'

export default function Page() {
  return (
    <main>
      <h1>Redfox Daily Maze Race</h1>
      <p className="sub">One shared maze every day. One run each. Fastest time to the exit wins the day.</p>
      <div className="ad">Ad space (728×90) — replace with your AdSense/ad-network code</div>
      <MazeRace />
      <div className="ad">Ad space (300×250) — replace with your AdSense/ad-network code</div>
    </main>
  )
}
