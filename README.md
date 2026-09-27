# Redfox Daily Maze Race

A browser-based daily maze challenge. Everyone who plays on the same day gets the **same randomly generated maze** (new maze + new exit location every day), and races to reach the exit as fast as possible. One run per player per day.

## Features

- **Procedurally generated maze** — built with a recursive-backtracking algorithm, seeded by the current date so the maze (and exit position) is identical for every player on a given day, but different tomorrow.
- **Once-per-day limit** — each player gets a single attempt per day; finishing locks in your time until the next day's maze.
- **Live leaderboard** — fastest times for the day, updated in real time.
- **Live player presence** — see other racers currently in the maze at the same time as you.
- **Keyboard, on-screen, and click controls** — arrow keys, WASD, or the on-screen D-pad.
- **Ad placement slots** — marked spots in the layout ready for real ad network code (e.g. Google AdSense) once approved.

## Running it

This is a single self-contained `daily-maze.html` file — no build step, no dependencies. Open it directly in a browser, or upload it to any static host (GitHub Pages, Netlify, Vercel, your own server, etc.).

```
your-project/
  Redfox-daily-maze-race.html
  README.md
```

## Important limitations when self-hosting

The maze generation, timer, and controls all work standalone in any browser. However, the **live leaderboard and live player presence** features rely on Claude's built-in shared-state platform (`db`, `room`, and `user` capabilities) and only function when the page is opened through its published Claude artifact link, not when the raw HTML file is hosted elsewhere. If you self-host this file, you'll need to build your own backend (e.g. Firebase, Supabase, a small Node server with WebSockets) to restore multiplayer scoring and presence.

## Ads and monetization

The page includes two placeholder ad blocks (a 728×90 banner and a 300×250 box). To actually earn ad revenue:

1. Get your own domain and hosting (see limitation above — AdSense requires you to control the domain).
2. Sign up for an ad network such as Google AdSense and get your site verified and approved.
3. Replace the placeholder `<div class="ad">` blocks in `daily-maze.html` with the ad code your network provides.
4. Set your payout method (PayPal, bank transfer, etc.) directly in that ad network's own dashboard — this is handled entirely by the ad network, not by the game itself.

## Customization ideas

- Adjust `COLS` / `ROWS` in the script for a bigger or smaller maze.
- Change `CELL` size for zoom level.
- Swap the color theme via the CSS custom properties at the top of the `<style>` block.
- Add sound effects, a move counter, or a "share your time" button.
