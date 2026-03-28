# VidMetrics

> **Instant competitor intelligence for YouTube creators and agencies**

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-blue?style=flat-square&logo=tailwind-css)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel)

[**Live Demo**](https://vidmetrics-git-main-yahyas-projects-cbbf0863.vercel.app/)

---

## Features

✅ **YouTube channel analysis** via URL, @handle, or channel ID  
✅ **Video performance table** — views, likes, comments, engagement rate  
✅ **VidScore** — proprietary 0-100 performance scoring algorithm  
✅ **Trending detection** — flags high-velocity recent uploads  
✅ **Channel comparison mode** — analyze up to 3 channels side by side  
✅ **Summary stat cards** — total views, avg views, avg engagement, most active month  
✅ **Top 10 videos bar chart** with gradient fills  
✅ **CSV export** — download full analysis with one click  
✅ **Demo mode** — pre-loaded data for instant presentation  
✅ **Recently analyzed channels** — quick re-access via localStorage  
✅ **Fully mobile responsive**

---

## Getting Started

1. **Clone**:  
   ```bash
   git clone https://github.com/Pordilz/VidMetrics
   cd vidmetrics
   ```

2. **Install**:  
   ```bash
   npm install
   ```

3. **Setup**:  
   Create a `.env.local` file by copying the example and add your YouTube API key:
   ```bash
   cp .env.example .env.local
   ```
   *Add `YOUTUBE_API_KEY=your_key_here` to `.env.local`.*

4. **Run**:  
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to see the dashboard.

---

## VidScore Algorithm

VidMetrics uses a proprietary scoring formula to rank video performance objectively across different channel sizes:

- **Views Score (40%)**: Normalized against the channel's highest-viewed video to measure relative success.
- **Engagement Score (40%)**: Normalized against a 5% benchmark rate (likes + comments / views), rewarding high-interaction content.
- **Recency Score (20%)**: Decays over time to highlight fresh content:
    - **0–30 days**: 20 points
    - **31–90 days**: 10 points
    - **90+ days**: 0 points

---

## Architecture

- **Next.js 14 App Router**: Leveraging Server Components and optimized routing for high performance.
- **Server-Side API**: All API calls are executed through `/app/api/` routes to ensure security.
- **Key Safety**: The YouTube API key is handled strictly server-side and never exposed to the client.
- **Mock Data Fallback**: Built-in fallback system for demo stability if API quotas are exceeded.

---

## What's Next (V2)

- 🤖 **AI Content Intelligence**: Claude API integration for automated script analysis and title suggestions.
- 📧 **Scheduled Monitoring**: Daily/weekly performance reports sent directly to email.
- 🔍 **Content Gap Analysis**: Identifying underserved topics by comparing competitors side-by-side.
- 💬 **Sentiment Analysis**: Analyzing audience mood and feedback on top-performing comments.
- 🏷️ **White-Label Export**: Personalized PDF reports for agency clients.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 14 (App Router) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **Charts** | Recharts / Chart.js |
| **API** | YouTube Data API v3 |
| **Deployment** | Vercel |
| **Language** | TypeScript |
