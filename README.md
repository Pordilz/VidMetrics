# VidMetrics

Competitive YouTube intelligence for quickly benchmarking channel performance, publishing cadence, and breakout videos.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Chart.js](https://img.shields.io/badge/Chart.js-4-orange?style=flat-square&logo=chartdotjs)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)

[Live Demo](https://vidmetrics-git-main-yahyas-projects-cbbf0863.vercel.app/)

## Overview

VidMetrics analyzes a YouTube channel from a URL, `@handle`, or channel ID and turns the latest uploads into a clean competitive dashboard. It is built for fast reads: a channel header, quick-glance KPIs, sortable video performance data, chart-based engagement views, and mobile-friendly inspection patterns.

The app uses live YouTube Data API responses when available and falls back to curated demo datasets for stable presentations and local demos.

## Current Feature Set

- Analyze channels by URL, `@handle`, or channel ID
- Quick-load sample channels from the landing page
- Persist recently analyzed channels in `localStorage`
- Summary KPI cards with expandable detail states
- Default `VidScore` sorting in the main performance table
- Trending badges for qualifying videos
- Top-video performance chart
- Interaction breakdown doughnut chart
- Publishing cadence heatmap with desktop tooltip and mobile tap inspection
- Date filters and sorting by views, likes, comments, engagement, and publish date
- CSV export for the current video set
- Copy-link sharing for the current dashboard state
- Side-by-side comparison mode with `+ Add Channel`
- Responsive mobile layout with cards instead of broken table columns
- Loading, invalid-input, and API-fallback states

## Product Notes

- Browser title: `VidMetrics — Competitive YouTube Intelligence`
- No client-side YouTube API key exposure; requests are proxied through server routes
- Demo fallback data currently includes curated `@MrBeast` and `@mkbhd` datasets

## VidScore and Trending

`VidScore` is the dashboard's primary ranking signal. It blends relative view strength, engagement performance, and recency so newer high-performing uploads surface quickly without being dominated only by lifetime channel size.

The Trending indicator is separate from the raw score display. It highlights videos showing strong recent momentum based on recency, view velocity compared with the channel baseline, and engagement strength.

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Global CSS with utility support |
| Charts | Chart.js |
| Motion | Framer Motion |
| Icons | Lucide React |
| 3D Landing Visual | Three.js |
| Data Source | YouTube Data API v3 |
| Deployment | Vercel |

## Project Structure

```text
app/
  api/
    channel/route.ts
    videos/route.ts
  dashboard/page.tsx
  layout.tsx
  page.tsx
  globals.css
components/
  landing/
  ui/
lib/
  formatters.ts
  recent-channels.ts
  mock-data/
```

## Getting Started

1. Clone the repository.

   ```bash
   git clone https://github.com/Pordilz/VidMetrics.git
   cd VidMetrics/vidmetrics
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create local environment variables.

   ```bash
   cp .env.example .env.local
   ```

4. Add your YouTube API key to `.env.local`.

   ```bash
   YOUTUBE_API_KEY=your_key_here
   ```

5. Start the development server.

   ```bash
   npm run dev
   ```

6. Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Useful Local Checks

```bash
npm run lint
npm run build
```

## API and Security

- The browser talks only to internal Next.js routes under `app/api`
- The YouTube API key stays server-side
- If live API requests fail, the dashboard can fall back to mock data so the interface still renders

## Known Demo Paths

- Landing page: [http://127.0.0.1:3000](http://127.0.0.1:3000)
- Example dashboard: [http://127.0.0.1:3000/dashboard?q=@mkbhd](http://127.0.0.1:3000/dashboard?q=@mkbhd)
- Comparison demo: load a channel, then use `+ Add Channel`

## Status

VidMetrics is currently positioned as a polished demo-ready analytics product with responsive dashboard views, comparison workflows, export tooling, and stable fallback behavior for presentations.
