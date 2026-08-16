# 🎬 Family Watch Advisor & OTT Media Hub (`moviesugesstion.ott`)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)
![AI Neural Engine](https://img.shields.io/badge/AI-Neural%20Engine-10B981?style=for-the-badge&logo=openai)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

**A high-performance, self-hosted streaming portal, AI neural recommendation engine, and Plex/Spotify-grade media server built with Next.js 15, TypeScript, and Prisma.**

[Live Features](#-key-features) • [Quick Start](#-quick-start) • [Deployment Guide](#-deployment-guide) • [Architecture](#-architecture) • [API Documentation](#-api-endpoints)

</div>

---

## 🌟 Overview

**Family Watch Advisor** is an all-in-one entertainment ecosystem combining:
1. **OTT Catalog & Smart Discovery**: Real-time aggregation of movies and TV shows across Netflix, Prime Video, Disney+ Hotstar, Apple TV+, and JioCinema with TMDb & IMDb ratings.
2. **Spotify-Grade Music Studio**: In-browser audio player with real-time waveform equalizer, drag-and-drop song uploader, persistent storage, and neural similarity clustering.
3. **Local Media Hub (Plex/Jellyfin Style)**: High-speed local video/audio streaming over Wi-Fi/LAN using HTTP 206 partial-content range requests (instant seeking) with QR code generation for mobile playback.
4. **Deep Neural Recommendation Engine**: Client & server neural networks that compute cosine similarity across acoustic features (Energy, BPM, Mood, Danceability) and cinematic attributes.

---

## ✨ Key Features

### 🎵 1. Music Player & Persistent Storage
- **Drag & Drop Upload**: Upload `.mp3`, `.flac`, `.wav`, `.m4a`, `.aac`, `.ogg`, and `.opus` files straight from the web interface.
- **Server Persistence**: Automatically stores songs into `data/uploads/music` with automatic metadata tag indexing.
- **AI Neural Similarity Radar**: Generates a 4-dimensional acoustic radar for every track and auto-queues similar songs.
- **Spotify Controls**: Continuous sticky player, volume slider, shuffle, repeat, track deletion, and audio equalizer.

### 🎬 2. Cinema & Video Hub
- **Instant LAN Streaming**: Zero-lag streaming to smartphones, tablets, and smart TVs on your home Wi-Fi via automatic local IP discovery and QR code scanner.
- **HTTP 206 Seek Engine**: Full seeking support matching YouTube/Netflix protocol.
- **Poster & Metadata Enrichment**: Automatically pulls posters, synopsis, release years, cast, and ratings from TMDb and IMDb.
- **VLC Player Interop**: Direct `vlc://` deep links or cinema-grade fullscreen in-browser video player.

### 🧠 3. Neural Recommendation System
- **Multi-Layer Perceptron (MLP)**: Trained neural network model predicting user affinity based on genre preferences, runtime, and ratings.
- **Explainable AI**: Provides transparent explanations ("*Recommended because you liked thriller movies with 8.0+ IMDb rating*").

### 👨‍👩‍👧‍👦 4. Family Safety & Profiles
- Multiple user profiles with individual PIN protection.
- Content rating filters (Kids, Teens, Adults).
- Watch history tracking and personalized watchlists.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15 (App Router)](https://nextjs.org/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS Glassmorphism |
| **Database & ORM** | [Prisma ORM](https://www.prisma.io/) (PostgreSQL & SQLite File DB fallback) |
| **Icons & UI** | [Lucide React](https://lucide.dev/) |
| **Audio/Video** | HTML5 Audio/Video API + Custom HTTP 206 Streaming Engine |
| **Containerization** | [Docker](https://www.docker.com/) & Docker Compose |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18.18.0 or newer
- **npm** or **pnpm** or **yarn**
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/e4win2006/moviesugesstion.ott.git
   cd moviesugesstion.ott
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/movies_db" # Or use file SQLite
   JWT_SECRET="your-super-secret-jwt-key"
   TMDB_API_KEY="your_tmdb_api_key_optional"
   MEDIA_MOVIES_DIR="C:/Users/YourName/Videos" # Optional local folder
   MEDIA_MUSIC_DIR="C:/Users/YourName/Music"   # Optional local folder
   PORT=3000
   ```

4. **Initialize Database & Seed Data:**
   ```bash
   npx prisma generate
   npx prisma db push
   npm run db:seed
   ```

5. **Start Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deployment Guide

### Option 1: Deploy on Vercel (1-Click & Free)
1. Fork or push your code to GitHub.
2. Go to **[vercel.com/new](https://vercel.com/new)** and import `moviesugesstion.ott`.
3. Add your environment variables:
   - `DATABASE_URL` (Supabase, Neon, or Railway PostgreSQL)
   - `JWT_SECRET`
   - `TMDB_API_KEY` (optional)
4. Click **Deploy**. Vercel will automatically build and publish your web page with free SSL.

### Option 2: Deploy with Docker / Docker Compose
A production-ready `Dockerfile` and `docker-compose.yml` are included:

```bash
docker compose up -d --build
```
This boots the Next.js server with persistent disk volume mounted at `/data` for music and movie uploads.

### Option 3: Deploy on Render / Railway / VPS
1. Connect your repository to [Render](https://render.com) or [Railway](https://railway.app).
2. Set Build Command: `npm run build`.
3. Set Start Command: `npm start`.
4. Attach a persistent volume to `/data` so uploaded music tracks remain permanently stored.

---

## 📂 Project Structure

```text
├── app/
│   ├── (app)/                  # Main UI Layout & Pages
│   │   ├── discover/           # OTT Catalog discovery
│   │   ├── genres/             # Genre & rating filters
│   │   ├── history/            # User playback history
│   │   ├── import/             # Catalog import tools
│   │   ├── library/            # Local media & Music studio browser
│   │   ├── player/             # Video cinema player
│   │   ├── profile/            # Family profiles & PINs
│   │   └── search/             # Global TMDb/IMDb search
│   └── api/                    # Backend API Routes
│       ├── media/
│       │   ├── upload/         # Multipart audio/video file uploader
│       │   ├── files/          # Library scanner & file deletion
│       │   ├── stream/         # HTTP Range seekable streaming
│       │   ├── lan-info/       # Local Wi-Fi IP & QR code generator
│       │   └── music-neural/   # Neural acoustic similarity API
│       ├── catalog/            # Movie & show feed
│       └── recommendations/    # AI Neural Recommender endpoints
├── components/
│   ├── app-shell.tsx           # Global responsive navigation
│   ├── local-music-player.tsx  # Spotify-grade audio player with neural radar
│   ├── music-upload-modal.tsx  # Drag & drop upload modal
│   ├── local-video-player.tsx  # Cinema video player
│   └── neural-model-widget.tsx # Live neural network visualizer
├── data/
│   └── uploads/                # Persistent server storage for uploaded media
├── lib/
│   ├── media-db.ts             # Storage configuration manager
│   ├── media-scanner.ts        # Recursive filesystem scanner & tag reader
│   ├── music-neural-engine.ts  # Acoustic feature extraction & vector math
│   └── neural-net.ts           # MLP Neural Network implementation
├── prisma/
│   └── schema.prisma           # Prisma database schema
├── Dockerfile                  # Container definition
├── docker-compose.yml          # Multi-container orchestration
└── package.json
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/media/upload` | `POST` | Uploads audio/video files to persistent storage (`data/uploads/music`). |
| `/api/media/files` | `GET` | Scans and lists all indexed media with enriched metadata. |
| `/api/media/files` | `DELETE` | Removes a media file from library storage. |
| `/api/media/stream?p={id}` | `GET` | HTTP 206 range streamer with instant seeking support. |
| `/api/media/lan-info` | `GET` | Returns LAN IP address and mobile stream URL. |
| `/api/recommendations` | `GET` | Returns AI personalized title recommendations. |
| `/api/recommendations/:id/explain` | `GET` | Explains why a title was recommended. |
| `/api/media/search-imdb` | `GET` | Searches IMDb/TMDb for posters and synopsis. |

---

## 🛡️ Security & Privacy
- **Path Traversal Protection**: All streaming and upload endpoints sanitize file paths against `..` exploits.
- **Type Whitelisting**: Strict MIME and extension validation prevents unauthorized file execution.
- **PIN Protected Profiles**: Secure access controls for family environments.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/e4win2006/moviesugesstion.ott/issues).

---

## 📄 License
This project is licensed under the **MIT License**.

<div align="center">
Built with ❤️ by <b>Edwin Tom Joseph</b>
</div>