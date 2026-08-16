"use client";

/**
 * /library — Local Media Library
 * Plex/Jellyfin-style browser for movies and music.
 * Features:
 *  - Native OS Folder Picker (Windows File Explorer dialog, like VS Code)
 *  - Real Movie Metadata Search (Title, Plot Overview, Release Year, Genres)
 *  - Movie Posters & Backdrop display from TMDB
 *  - Fixed LAN IP Streaming & QR/URL generator for nearby devices
 *  - Cinema Fullscreen Video Player & Sticky Audio Bar
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, BrainCircuit, Check, CheckCircle2, ChevronRight, Copy, ExternalLink,
  Film, Folder, FolderOpen, HardDrive, Heart, Info, Laptop, Loader2, Music,
  Play, Plus, QrCode, Radio, RefreshCw, Save, Search, Shuffle, SlidersHorizontal,
  Smartphone, Sparkles, Star, Tv, Upload, Wifi, X, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LocalVideoPlayer } from "@/components/local-video-player";
import { LocalMusicPlayer } from "@/components/local-music-player";
import type { MediaFile } from "@/lib/media-types";
import { formatBytes } from "@/lib/media-types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "movies" | "music";
type SortKey = "name" | "size" | "date" | "ext" | "rating" | "year";

interface FilesResponse {
  files: MediaFile[];
  configured: boolean;
  dir: string | null;
  exists?: boolean;
  message?: string;
  count?: number;
}

interface ConfigResponse {
  movies: { configured: boolean; exists: boolean; path: string | null; fileCount: number };
  music: { configured: boolean; exists: boolean; path: string | null; fileCount: number };
  suggestions: { movies: string[]; music: string[] };
}

interface PickFolderResult {
  path: string;
  exists: boolean;
  fileCount: number;
  totalCount: number;
}

interface LanInfo {
  ip: string;
  port: string;
  url: string;
  libraryUrl: string;
}

// ─── Video Card with Poster Support ───────────────────────────────────────────

function VideoCard({
  file,
  onClick,
}: {
  file: MediaFile;
  onClick: () => void;
}) {
  const meta = file.metadata;
  const poster = meta?.posterUrl;
  const displayTitle = meta?.cleanTitle || file.name;
  const [videoThumb, setVideoThumb] = useState<string | null>(null);

  // Generate real video frame snapshot if no online/local poster exists
  useEffect(() => {
    if (poster || !file.nativelyPlayable) return;
    const streamSrc = file.customBlobUrl || `/api/media/stream?p=${file.id}`;
    const video = document.createElement("video");
    video.src = streamSrc;
    video.muted = true;
    video.preload = "metadata";

    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 320;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          setVideoThumb(canvas.toDataURL("image/jpeg", 0.75));
        }
      } catch {
        // Ignore canvas CORS error if any
      } finally {
        video.src = "";
      }
    };

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(15, (video.duration || 30) * 0.1);
    }, { once: true });

    video.addEventListener("seeked", onSeeked, { once: true });

    return () => {
      video.removeEventListener("seeked", onSeeked);
      video.src = "";
    };
  }, [poster, file.id, file.customBlobUrl, file.nativelyPlayable]);

  const activeImage = poster || videoThumb;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.03] text-left transition hover:border-lime/40 hover:bg-white/[.06] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-lime/50"
    >
      {/* Poster-style container */}
      <div className="relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden bg-zinc-900">
        {activeImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activeImage}
            alt={displayTitle}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
            <Film size={36} className="text-zinc-700 transition group-hover:scale-110 group-hover:text-lime/60" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
              {file.ext.slice(1)} Video
            </span>
          </div>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-lime text-ink shadow-2xl transition group-hover:scale-110">
            <Play size={24} fill="currentColor" className="ml-1" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none">
          {meta?.rating ? (
            <span className="flex items-center gap-0.5 rounded-md bg-black/80 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-black text-amber-400 border border-amber-400/20">
              <Star size={10} fill="currentColor" />
              {meta.rating}
            </span>
          ) : <span />}

          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide backdrop-blur-md",
              file.nativelyPlayable
                ? "bg-lime/20 text-lime border border-lime/30"
                : "bg-amber-500/20 text-amber-400 border border-amber-500/30",
            )}
          >
            {file.ext.slice(1)}
          </span>
        </div>

        {/* Year Tag Bottom Left */}
        {meta?.year && (
          <span className="absolute bottom-2 left-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300 backdrop-blur-md">
            {meta.year}
          </span>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <div>
          <p className="line-clamp-2 text-xs font-bold leading-snug text-white group-hover:text-lime transition">
            {displayTitle}
          </p>
          {meta?.actors && (
            <p className="mt-1 line-clamp-1 text-[10px] text-zinc-400">
              <span className="text-zinc-500">Cast: </span>{meta.actors}
            </p>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-1 pt-1 border-t border-white/[.04]">
          <span className="text-[10px] text-zinc-500 font-mono">{file.sizeFormatted}</span>

          {meta?.imdbUrl && (
            <a
              href={meta.imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-md bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 text-[9px] font-black text-amber-400 hover:bg-amber-400/20 transition"
              title="Open Movie on IMDb"
            >
              <Star size={9} fill="currentColor" />
              <span>IMDb</span>
              <ExternalLink size={8} className="opacity-70" />
            </a>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Spotify Music Row with Neural Similarity Trigger ────────────────────────

function MusicRow({
  file,
  index,
  isPlaying,
  isCurrent,
  onClick,
  onNeuralSimilar,
}: {
  file: MediaFile;
  index: number;
  isPlaying: boolean;
  isCurrent: boolean;
  onClick: () => void;
  onNeuralSimilar: (e: React.MouseEvent) => void;
}) {
  const meta = file.metadata;
  const poster = meta?.posterUrl;
  const artist = meta?.artist;
  const album = meta?.album;
  const [liked, setLiked] = useState(false);

  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 sm:gap-4 rounded-xl px-3 sm:px-4 py-2.5 text-left transition hover:bg-white/[.06] cursor-pointer border",
        isCurrent ? "bg-[#1db954]/10 border-[#1db954]/30 shadow-md" : "border-transparent",
      )}
    >
      {/* Track Index / Equalizer / Play button */}
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center">
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={poster} alt={file.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg text-xs font-bold",
              isCurrent ? "text-[#1db954]" : "text-zinc-500",
            )}
          >
            {isCurrent && isPlaying ? (
              <div className="flex items-end gap-0.5 h-3.5">
                {[1, 2, 3].map((b) => (
                  <div
                    key={b}
                    className="w-1 rounded-sm bg-[#1db954] animate-pulse"
                    style={{ height: `${30 + b * 25}%`, animationDelay: `${b * 80}ms` }}
                  />
                ))}
              </div>
            ) : (
              index + 1
            )}
          </span>
        )}

        {/* Hover play overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
          <Play size={14} fill="white" className="text-white ml-0.5" />
        </div>
      </div>

      {/* Title & Artist */}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-xs sm:text-sm font-bold", isCurrent ? "text-[#1db954]" : "text-white")}>
          {meta?.cleanTitle || file.name}
        </p>
        <p className="truncate text-[11px] text-zinc-400">
          {artist ? <span className="text-zinc-300 font-medium">{artist}</span> : null}
          {artist && album ? " · " : null}
          {album ? <span className="text-zinc-500">{album}</span> : null}
          {!artist && !album ? `${file.ext.toUpperCase().slice(1)} · ${file.sizeFormatted}` : null}
        </p>
      </div>


      {/* Album name (Desktop only) */}
      {album && (
        <div className="hidden lg:block w-44 truncate text-xs text-zinc-400">
          {album}
        </div>
      )}

      {/* File Size */}
      <div className="hidden sm:block text-right font-mono text-[11px] text-zinc-500 w-16 shrink-0">
        {file.sizeFormatted}
      </div>

      {/* AI Neural Similar Trigger Button */}
      <button
        onClick={onNeuralSimilar}
        className="flex items-center gap-1 rounded-xl bg-[#1db954]/10 hover:bg-[#1db954] hover:text-ink border border-[#1db954]/25 px-2.5 py-1 text-[11px] font-bold text-[#1db954] transition active:scale-95 shrink-0"
        title="Analyze with Neural Network for similar songs"
      >
        <BrainCircuit size={12} />
        <span className="hidden md:inline">Similar</span>
      </button>

      {/* Heart / Like toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setLiked(!liked);
        }}
        className={cn(
          "p-1.5 transition active:scale-90 shrink-0",
          liked ? "text-[#1db954]" : "text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100"
        )}
        title="Like Song"
      >
        <Heart size={14} fill={liked ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

// ─── Main Library Page ────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [tab, setTab] = useState<Tab>("movies");
  const [data, setData] = useState<FilesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Folder Customizer Modal State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [configData, setConfigData] = useState<ConfigResponse | null>(null);
  const [pickingFolder, setPickingFolder] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<PickFolderResult | null>(null);
  const [savingFolder, setSavingFolder] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // LAN Streaming Info State
  const [showLanModal, setShowLanModal] = useState(false);
  const [lanInfo, setLanInfo] = useState<LanInfo | null>(null);
  const [copiedLan, setCopiedLan] = useState(false);

  // Client-selected device files
  const [deviceFiles, setDeviceFiles] = useState<MediaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video player state
  const [videoFile, setVideoFile] = useState<MediaFile | null>(null);
  const [videoIdx, setVideoIdx] = useState(0);

  // Music player state
  const [musicQueue, setMusicQueue] = useState<MediaFile[]>([]);
  const [musicStart, setMusicStart] = useState(0);
  const [musicOpen, setMusicOpen] = useState(false);
  const [playingIdx, setPlayingIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);

  // IMDb & Web Metadata Search Modal State
  const [showImdbModal, setShowImdbModal] = useState(false);
  const [imdbQuery, setImdbQuery] = useState("");
  const [imdbResults, setImdbResults] = useState<any[]>([]);
  const [searchingImdb, setSearchingImdb] = useState(false);
  const [selectedFileForMatch, setSelectedFileForMatch] = useState<MediaFile | null>(null);

  // ── Auto-Refresh & Background Polling State ─────────────────────────────
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(30); // 30s default
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>("Just now");

  const handleSearchImdb = async (q: string) => {
    if (!q.trim()) {
      setImdbResults([]);
      return;
    }
    setSearchingImdb(true);
    try {
      const res = await fetch(`/api/media/search-imdb?q=${encodeURIComponent(q)}&type=${tab}`);
      const json = await res.json();
      setImdbResults(json.results || []);
    } catch {
      setImdbResults([]);
    } finally {
      setSearchingImdb(false);
    }
  };

  const handleApplyMetadata = (matched: any) => {
    if (!selectedFileForMatch) return;
    const updatedFiles = (data?.files || []).map((f) => {
      if (f.id === selectedFileForMatch.id) {
        return {
          ...f,
          name: matched.title || f.name,
          metadata: {
            ...f.metadata,
            cleanTitle: matched.title || f.name,
            year: matched.year || f.metadata?.year,
            posterUrl: matched.posterUrl || f.metadata?.posterUrl,
            imdbId: matched.imdbId || f.metadata?.imdbId,
            imdbUrl: matched.imdbUrl || f.metadata?.imdbUrl,
            actors: matched.actors || f.metadata?.actors,
            artist: matched.artist || f.metadata?.artist,
            album: matched.album || f.metadata?.album,
          },
        };
      }
      return f;
    });

    setData((prev) => (prev ? { ...prev, files: updatedFiles } : prev));
    setFeedbackMsg({
      type: "success",
      text: `✓ Successfully matched "${matched.title}" with IMDb metadata!`,
    });
    setShowImdbModal(false);
  };

  // ── Load Config Status & LAN Info ───────────────────────────────────────
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/media/config");
      const json = (await res.json()) as ConfigResponse;
      setConfigData(json);

      const lanRes = await fetch("/api/media/lan-info");
      const lanJson = (await lanRes.json()) as LanInfo;
      setLanInfo(lanJson);
    } catch {
      // Ignore
    }
  }, []);

  // ── Fetch file list from server (Full reload) ───────────────────────────
  const fetchFiles = useCallback(async (type: Tab, customDir?: string) => {
    setLoading(true);
    setFeedbackMsg(null);
    try {
      const query = new URLSearchParams({ type });
      if (customDir) query.set("dir", customDir);
      const res = await fetch(`/api/media/files?${query.toString()}`);
      const json = (await res.json()) as FilesResponse;
      setData(json);
      const now = new Date();
      setLastRefreshedAt(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    } catch {
      setData({ files: [], configured: false, dir: null, message: "Failed to load files." });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Quiet Background Auto-Refresh ───────────────────────────────────────
  const quietRefresh = useCallback(async () => {
    // Avoid background polling while a video is playing in cinema mode
    if (videoFile) return;
    try {
      setIsBackgroundRefreshing(true);
      const query = new URLSearchParams({ type: tab });
      const res = await fetch(`/api/media/files?${query.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as FilesResponse;
        setData((prev) => {
          if (!prev) return json;
          const prevIds = (prev.files || []).map((f) => f.id).join("|");
          const nextIds = (json.files || []).map((f) => f.id).join("|");
          if (prevIds !== nextIds || prev.files.length !== json.files.length) {
            return json;
          }
          return prev;
        });
        const now = new Date();
        setLastRefreshedAt(
          now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
      }
    } catch {
      // Ignore background poll errors
    } finally {
      setIsBackgroundRefreshing(false);
    }
  }, [tab, videoFile]);

  // ── Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    fetchConfig();
    fetchFiles(tab);
  }, [tab, fetchFiles, fetchConfig]);

  // ── Auto-Refresh Timer Interval ─────────────────────────────────────────
  useEffect(() => {
    if (autoRefreshSec <= 0) return;
    const interval = setInterval(() => {
      quietRefresh();
    }, autoRefreshSec * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshSec, quietRefresh]);

  // ── Open Native Operating System Folder Picker ─────────────────────────
  const handleOpenNativePicker = async () => {
    setPickingFolder(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/media/pick-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Unable to parse server response");
      }

      if (json.ok && json.path) {
        setPendingSelection({
          path: json.path,
          exists: json.exists,
          fileCount: json.fileCount,
          totalCount: json.totalCount,
        });
      } else if (json.cancelled) {
        // Selection was cancelled or closed
      } else if (json.error) {
        setFeedbackMsg({
          type: "error",
          text: json.error,
        });
      }
    } catch (err) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to open folder picker",
      });
    } finally {
      setPickingFolder(false);
    }
  };

  // ── Save & Scan Selected Folder ────────────────────────────────────────
  const handleSaveAndScan = async () => {
    if (!pendingSelection?.path) return;
    setSavingFolder(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/media/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: tab, path: pendingSelection.path }),
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Unable to parse server response");
      }

      if (!res.ok || json.error) {
        setFeedbackMsg({ type: "error", text: json.error || "Failed to update folder" });
      } else {
        // Remember in browser storage as well
        try {
          localStorage.setItem(
            tab === "movies" ? "media_movies_folder" : "media_music_folder",
            pendingSelection.path
          );
        } catch {}

        setFeedbackMsg({
          type: "success",
          text: `Folder saved & permanently remembered! Found ${pendingSelection.fileCount} ${tab === "movies" ? "movie" : "song"} file(s).`,
        });
        fetchConfig();
        fetchFiles(tab, pendingSelection.path);
        setShowFolderModal(false);
        setPendingSelection(null);
      }
    } catch (err) {
      setFeedbackMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save folder",
      });
    } finally {
      setSavingFolder(false);
    }
  };

  // ── Copy LAN Streaming URL ─────────────────────────────────────────────
  const handleCopyLanUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLan(true);
    setTimeout(() => setCopiedLan(false), 2000);
  };

  // ── Handle Client Device File Picker ───────────────────────────────────
  const handleDeviceFilesPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files;
    if (!picked || picked.length === 0) return;

    const newFiles: MediaFile[] = [];
    for (let i = 0; i < picked.length; i++) {
      const f = picked[i];
      const name = f.name;
      const ext = ("." + (name.split(".").pop() || "")).toLowerCase();
      const isVideo = [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"].includes(ext);
      const isAudio = [".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg"].includes(ext);

      if (!isVideo && !isAudio) continue;

      const blobUrl = URL.createObjectURL(f);
      newFiles.push({
        id: `client_${Date.now()}_${i}`,
        name: name.replace(ext, ""),
        filename: name,
        relativePath: f.webkitRelativePath || name,
        ext,
        mediaType: isVideo ? "video" : "audio",
        sizeBytes: f.size,
        sizeFormatted: formatBytes(f.size),
        modifiedAt: new Date(f.lastModified).toISOString(),
        mimeType: f.type || (isVideo ? "video/mp4" : "audio/mpeg"),
        nativelyPlayable: isVideo ? [".mp4", ".webm", ".mov"].includes(ext) : true,
        customBlobUrl: blobUrl,
      });
    }

    if (newFiles.length > 0) {
      setDeviceFiles((prev) => [...newFiles, ...prev]);
      setFeedbackMsg({
        type: "success",
        text: `Loaded ${newFiles.length} file(s) directly from your device!`,
      });
    }
  };

  // ── Combine server and client files ─────────────────────────────────────
  const allFiles = [
    ...deviceFiles.filter((f) => (tab === "movies" ? f.mediaType === "video" : f.mediaType === "audio")),
    ...(data?.files || []),
  ];

  // ── Deep Search across Metadata (Title, Synopsis, Year, Genre) ─────────
  const query = search.toLowerCase().trim();
  const filtered = allFiles.filter((f) => {
    if (!query) return true;
    const meta = f.metadata;
    return (
      f.name.toLowerCase().includes(query) ||
      f.filename.toLowerCase().includes(query) ||
      (meta?.cleanTitle && meta.cleanTitle.toLowerCase().includes(query)) ||
      (meta?.overview && meta.overview.toLowerCase().includes(query)) ||
      (meta?.year && String(meta.year).includes(query)) ||
      (meta?.genres && meta.genres.some((g) => g.toLowerCase().includes(query)))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "name") {
      const nameA = a.metadata?.cleanTitle || a.name;
      const nameB = b.metadata?.cleanTitle || b.name;
      cmp = nameA.localeCompare(nameB);
    } else if (sortKey === "size") {
      cmp = a.sizeBytes - b.sizeBytes;
    } else if (sortKey === "date") {
      cmp = new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime();
    } else if (sortKey === "ext") {
      cmp = a.ext.localeCompare(b.ext);
    } else if (sortKey === "rating") {
      cmp = (a.metadata?.rating || 0) - (b.metadata?.rating || 0);
    } else if (sortKey === "year") {
      cmp = (a.metadata?.year || 0) - (b.metadata?.year || 0);
    }
    return sortAsc ? cmp : -cmp;
  });

  const videos = sorted.filter((f) => f.mediaType === "video");
  const music = sorted.filter((f) => f.mediaType === "audio");

  // ── Video Navigation ────────────────────────────────────────────────────
  const openVideo = (file: MediaFile) => {
    const idx = videos.findIndex((v) => v.id === file.id);
    setVideoIdx(idx);
    setVideoFile(file);
  };
  const prevVideo =
    videoIdx > 0
      ? () => {
          setVideoIdx(videoIdx - 1);
          setVideoFile(videos[videoIdx - 1]);
        }
      : undefined;
  const nextVideo =
    videoIdx < videos.length - 1
      ? () => {
          setVideoIdx(videoIdx + 1);
          setVideoFile(videos[videoIdx + 1]);
        }
      : undefined;

  // ── Music Queue ─────────────────────────────────────────────────────────
  const openMusic = (clickedFile: MediaFile) => {
    const idx = music.findIndex((f) => f.id === clickedFile.id);
    setMusicQueue(music);
    setMusicStart(idx);
    setMusicOpen(true);
    setPlayingIdx(idx);
    setIsPlaying(true);
  };

  const totalSize = allFiles.reduce((sum, f) => sum + f.sizeBytes, 0);
  const currentFolderPath = data?.dir || (tab === "movies" ? configData?.movies?.path : configData?.music?.path);
  const activeLanUrl = lanInfo?.libraryUrl || `http://192.168.1.6:3000/library`;

  return (
    <>
      {/* ── Video Player Modal (Cinema Fullscreen) ───────────────────────── */}
      {videoFile && (
        <LocalVideoPlayer
          file={videoFile}
          onClose={() => setVideoFile(null)}
          onPrev={prevVideo}
          onNext={nextVideo}
        />
      )}

      {/* ── Music Player Bar ────────────────────────────────────────────── */}
      {musicOpen && musicQueue.length > 0 && (
        <LocalMusicPlayer
          queue={musicQueue}
          initialIndex={musicStart}
          allLibrarySongs={music}
          onClose={() => {
            setMusicOpen(false);
            setPlayingIdx(-1);
            setIsPlaying(false);
          }}
        />
      )}

      {/* ── Hidden File Input for Device Files ──────────────────────────── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceFilesPicked}
        multiple
        className="hidden"
        accept="video/*,audio/*,.mkv,.mp4,.avi,.mov,.mp3,.flac,.wav,.m4a,.aac"
      />

      {/* ── Main Library View ───────────────────────────────────────────── */}
      <div className="py-6" style={{ paddingBottom: musicOpen ? "120px" : undefined }}>
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Local Media Hub</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">
              My Library
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Stream movies &amp; music across LAN with automatic poster &amp; metadata search.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search IMDb / Music Metadata */}
            <button
              onClick={() => {
                setSelectedFileForMatch(allFiles[0] || null);
                setShowImdbModal(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 sm:px-4 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-400/20 transition active:scale-95"
              title="Search IMDb for Movie & Song Metadata"
            >
              <Star size={15} fill="currentColor" />
              <span className="truncate">Search IMDb</span>
            </button>

            {/* Stream on Nearby Devices Button */}
            <button
              onClick={() => setShowLanModal(true)}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-lime/30 bg-lime/10 px-3 sm:px-4 py-2.5 text-xs font-bold text-lime hover:bg-lime/20 transition active:scale-95"
              title="Stream to Phone, Tablet, or TV on Wi-Fi"
            >
              <Wifi size={15} />
              <span className="truncate">LAN Stream</span>
            </button>

            {/* Change Folder Button */}
            <button
              onClick={() => {
                setPendingSelection(null);
                setShowFolderModal(true);
              }}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-lime px-3 sm:px-4 py-2.5 text-xs font-black text-ink hover:opacity-90 transition shadow-lg shadow-lime/10 active:scale-95"
            >
              <FolderOpen size={15} />
              <span className="truncate">Change Folder</span>
            </button>

            {/* Pick from Device */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.05] px-3 sm:px-4 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition active:scale-95"
              title="Open video or audio files directly from this device"
            >
              <Upload size={15} />
              <span className="truncate">Open File</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Message */}
        {feedbackMsg && (
          <div
            className={cn(
              "mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-xs font-medium",
              feedbackMsg.type === "success"
                ? "bg-lime/10 border border-lime/30 text-lime"
                : "bg-red-500/10 border border-red-500/30 text-red-400",
            )}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Active Folder Bar with LAN Quick Access & Auto-Sync Controls */}
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-3 px-4">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <HardDrive size={15} className="text-lime shrink-0" />
            <span className="font-bold text-zinc-400 shrink-0">
              {tab === "movies" ? "Movies Folder:" : "Music Folder:"}
            </span>
            <span className="font-mono text-zinc-200 truncate">
              {currentFolderPath || "Not selected"}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 text-xs text-zinc-400">
            <span className="font-mono text-[11px]">
              {allFiles.length} item(s) · {formatBytes(totalSize)}
            </span>

            {/* Auto-Sync Live Status & Interval Selector */}
            <div className="flex items-center gap-1.5 rounded-xl bg-white/[.04] border border-white/10 px-2 py-1 text-xs">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  autoRefreshSec > 0
                    ? isBackgroundRefreshing
                      ? "bg-amber-400 animate-ping"
                      : "bg-emerald-400 animate-pulse"
                    : "bg-zinc-600"
                )}
                title={
                  autoRefreshSec > 0
                    ? `Auto-sync active (every ${autoRefreshSec}s)`
                    : "Auto-sync disabled"
                }
              />
              <span className="text-[10px] sm:text-[11px] font-bold text-zinc-300">
                {isBackgroundRefreshing ? "Syncing..." : "Auto-Sync:"}
              </span>
              <select
                value={autoRefreshSec}
                onChange={(e) => setAutoRefreshSec(Number(e.target.value))}
                className="bg-transparent text-[10px] sm:text-[11px] font-bold text-lime outline-none cursor-pointer"
                title="Automatically refresh folder for newly added media"
              >
                <option value={10} className="bg-zinc-900 text-white">10s</option>
                <option value={30} className="bg-zinc-900 text-white">30s (Default)</option>
                <option value={60} className="bg-zinc-900 text-white">1 min</option>
                <option value={300} className="bg-zinc-900 text-white">5 min</option>
                <option value={0} className="bg-zinc-900 text-white">Off</option>
              </select>
            </div>

            {/* Manual Instant Re-scan Button */}
            <button
              onClick={() => fetchFiles(tab, currentFolderPath || undefined)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-2.5 py-1 text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition active:scale-95"
              title={`Scan now (Last checked: ${lastRefreshedAt})`}
            >
              <RefreshCw
                size={12}
                className={loading || isBackgroundRefreshing ? "animate-spin text-lime" : ""}
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs (Full width on mobile) */}
        <div className="mt-5 grid grid-cols-2 sm:flex sm:w-fit gap-1 rounded-2xl border border-white/10 bg-white/[.03] p-1 w-full sm:w-auto">
          {([
            { id: "movies", label: "Movies & Videos", icon: Film },
            { id: "music", label: "Music & Audio", icon: Music },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setSearch("");
              }}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition active:scale-95",
                tab === id ? "bg-lime text-ink shadow" : "text-zinc-400 hover:text-white",
              )}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col h-48 items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-lime" />
            <p className="text-xs text-zinc-400">Scanning folder &amp; fetching movie posters…</p>
          </div>
        )}

        {/* Library Content */}
        {!loading && (
          <>
            {/* Search & Sort Toolbar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder={`Search by title, synopsis, year, or genre…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[.04] py-2.5 pl-10 pr-4 text-xs sm:text-sm placeholder:text-zinc-500 focus:border-lime focus:outline-none"
                />
              </div>

              {/* Sort Controls (Horizontally scrollable on mobile) */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.03] p-1 overflow-x-auto scrollbar-none">
                <SlidersHorizontal size={13} className="ml-2 text-zinc-500 shrink-0" />
                {(["name", "rating", "year", "size", "date"] as SortKey[]).map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      if (sortKey === k) setSortAsc(!sortAsc);
                      else {
                        setSortKey(k);
                        setSortAsc(k === "rating" ? false : true);
                      }
                    }}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-bold capitalize transition shrink-0",
                      sortKey === k ? "bg-white/10 text-white" : "text-zinc-500 hover:text-white",
                    )}
                  >
                    {k} {sortKey === k ? (sortAsc ? "↑" : "↓") : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Empty State */}
            {sorted.length === 0 ? (
              <div className="flex h-56 flex-col items-center justify-center gap-3 text-center text-zinc-600 mt-6 rounded-2xl border border-dashed border-white/10 p-8">
                {tab === "movies" ? <Tv size={36} /> : <Music size={36} />}
                <p className="text-sm font-semibold text-zinc-300">
                  {search ? `No metadata match for "${search}"` : `No ${tab} files found in this folder`}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    onClick={() => {
                      setPendingSelection(null);
                      setShowFolderModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-ink hover:opacity-90"
                  >
                    <FolderOpen size={14} /> Choose Movies Folder
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] px-4 py-2 text-xs font-bold text-white hover:bg-white/10"
                  >
                    <Upload size={14} /> Open Files from Device
                  </button>
                </div>
              </div>
            ) : tab === "movies" ? (
              /* ── Movie Grid (Posters & Metadata) ───────────────────────── */
              <div className="mt-5">
                {videos.length > 0 && (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        {videos.length} Movies &amp; Videos
                      </p>
                      {search && (
                        <span className="text-xs text-lime">
                          {videos.length} matching search
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {videos.map((f) => (
                        <VideoCard key={f.id} file={f} onClick={() => openVideo(f)} />
                      ))}
                    </div>
                  </>
                )}
                {music.length > 0 && videos.length > 0 && <div className="mt-8 border-t border-white/5" />}
                {music.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
                      Audio — {music.length} tracks
                    </p>
                    <div className="space-y-1">
                      {music.map((f, i) => (
                        <MusicRow
                          key={f.id}
                          file={f}
                          index={i}
                          isCurrent={playingIdx === i && musicOpen}
                          isPlaying={isPlaying}
                          onClick={() => openMusic(f)}
                          onNeuralSimilar={(e) => {
                            e.stopPropagation();
                            openMusic(f);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Spotify Playlist Hero & Tracklist ──────────────────────── */
              <div className="mt-6 space-y-6">
                {/* Spotify Hero Playlist Card */}
                <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#1db954]/20 via-zinc-900/60 to-black p-5 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-7">
                  {/* Playlist Cover Art */}
                  <div className="relative h-40 w-40 sm:h-48 sm:w-48 shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 border border-white/15 bg-zinc-900 flex items-center justify-center group">
                    {music[0]?.metadata?.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={music[0].metadata.posterUrl} alt="" className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <Music size={56} className="text-[#1db954]" />
                    )}
                  </div>

                  {/* Playlist Metadata & Actions */}
                  <div className="min-w-0 flex-1 text-center sm:text-left space-y-2">
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#1db954]">
                      Public Playlist · AI Neural Engine
                    </p>
                    <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                      My Music &amp; Audio Library
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Auto-organized with high-res artwork, cosine similarity clustering, and smart AI radio.
                    </p>
                    <p className="text-xs font-mono text-zinc-500">
                      {music.length} songs · {formatBytes(totalSize)}
                    </p>

                    {/* Spotify Action Bar */}
                    <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
                      {music.length > 0 && (
                        <button
                          onClick={() => openMusic(music[0])}
                          className="flex items-center gap-2 rounded-full bg-[#1db954] px-6 py-3 text-xs font-black text-ink hover:scale-105 transition active:scale-95 shadow-lg shadow-[#1db954]/25"
                        >
                          <Play size={15} fill="currentColor" className="ml-0.5" />
                          <span>Play All</span>
                        </button>
                      )}

                      {music.length > 1 && (
                        <button
                          onClick={() => {
                            const randomIdx = Math.floor(Math.random() * music.length);
                            openMusic(music[randomIdx]);
                          }}
                          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-5 py-3 text-xs font-bold text-white transition active:scale-95"
                        >
                          <Shuffle size={14} />
                          <span>Shuffle</span>
                        </button>
                      )}

                      {music.length > 0 && (
                        <button
                          onClick={() => openMusic(music[0])}
                          className="flex items-center gap-1.5 rounded-full border border-[#1db954]/30 bg-[#1db954]/10 hover:bg-[#1db954]/20 px-5 py-3 text-xs font-bold text-[#1db954] transition active:scale-95"
                        >
                          <BrainCircuit size={14} />
                          <span>✨ AI Neural Mix</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracklist Table Header */}
                <div className="hidden sm:flex items-center gap-4 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 border-b border-white/10">
                  <span className="w-10 text-center">#</span>
                  <span className="flex-1">Title &amp; Artist</span>
                  <span className="hidden lg:block w-44">Album</span>
                  <span className="w-16 text-right">Size</span>
                  <span className="w-24 text-center">AI Similar</span>
                  <span className="w-8 text-center"></span>
                </div>

                {/* Tracklist Rows */}
                <div className="space-y-1">
                  {music.map((f, i) => (
                    <MusicRow
                      key={f.id}
                      file={f}
                      index={i}
                      isCurrent={playingIdx === i && musicOpen}
                      isPlaying={isPlaying}
                      onClick={() => openMusic(f)}
                      onNeuralSimilar={(e) => {
                        e.stopPropagation();
                        openMusic(f);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Native Desktop-Style Folder Settings Modal ───────────────────── */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/15 bg-[#0e1117] p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3 sm:pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Choose {tab === "movies" ? "Movies" : "Music"} Folder
                </h3>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Select the folder on your computer where your {tab === "movies" ? "movie" : "song"} files are stored.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setPendingSelection(null);
                }}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  Selected Directory:
                </p>

                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs sm:text-sm font-mono text-white">
                  <Folder className="text-lime shrink-0" size={18} />
                  <span className="truncate">
                    {pendingSelection?.path || currentFolderPath || "No folder selected"}
                  </span>
                </div>

                {/* Primary Action Button: Opens Native OS Dialog */}
                <button
                  onClick={handleOpenNativePicker}
                  disabled={pickingFolder}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 py-3 text-xs font-black text-white transition disabled:opacity-50 active:scale-95"
                >
                  {pickingFolder ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-lime" />
                      Opening Folder Picker…
                    </>
                  ) : (
                    <>
                      <FolderOpen size={16} className="text-lime" />
                      Browse &amp; Change Folder
                    </>
                  )}
                </button>
              </div>

              {/* Status / Validation Feedback */}
              {pendingSelection && (
                <div className="space-y-2 rounded-2xl border border-lime/20 bg-lime/[.05] p-4 text-xs font-medium text-lime">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>Folder exists</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={15} />
                    <span>
                      {pendingSelection.fileCount} {tab === "movies" ? "movie" : "song"} file(s) found
                    </span>
                  </div>
                  {pendingSelection.fileCount === 0 && (
                    <p className="mt-1 text-[11px] text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle size={13} />
                      No supported media files found in this folder.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setPendingSelection(null);
                }}
                className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-2.5 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndScan}
                disabled={!pendingSelection || savingFolder}
                className="flex items-center gap-2 rounded-xl bg-lime px-6 py-2.5 text-xs font-black text-ink hover:opacity-90 transition disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              >
                {savingFolder ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} strokeWidth={3} />
                )}
                Save &amp; Scan {tab === "movies" ? "Movies" : "Music"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Nearby LAN Streaming Modal (Fixed IP & Access Guide) ─────────── */}
      {showLanModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/15 bg-[#0e1117] p-5 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 text-white">
                <Wifi size={22} className="text-lime" />
                <div>
                  <h3 className="text-lg sm:text-xl font-black">Stream on Nearby Devices</h3>
                  <p className="text-xs text-zinc-400">
                    Watch movies on Phone, Tablet, or TV on the same Wi-Fi.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLanModal(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Direct LAN URL Box */}
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-2">
                  Open this link in any browser on your Wi-Fi:
                </p>
                <div className="flex items-center justify-between rounded-2xl border border-lime/30 bg-lime/[.06] p-3.5 px-4 font-mono text-xs sm:text-sm text-lime font-bold select-all">
                  <span className="truncate">{activeLanUrl}</span>
                  <button
                    onClick={() => handleCopyLanUrl(activeLanUrl)}
                    className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-xs font-black text-ink hover:opacity-90 transition shrink-0 ml-2 active:scale-95"
                  >
                    {copiedLan ? <Check size={13} /> : <Copy size={13} />}
                    {copiedLan ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="rounded-2xl border border-white/10 bg-white/[.02] p-4 space-y-3 text-xs text-zinc-300">
                <p className="font-bold text-white flex items-center gap-2">
                  <Smartphone size={15} className="text-lime" />
                  How to connect nearby devices:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-400 leading-relaxed">
                  <li>Make sure your phone / tablet is connected to the <strong>same Wi-Fi network</strong>.</li>
                  <li>Open Safari, Chrome, or any mobile browser.</li>
                  <li>Type <code className="text-lime font-bold">{activeLanUrl}</code> in the address bar.</li>
                  <li>Start playing any movie or music track with full seeking!</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <button
                onClick={() => setShowLanModal(false)}
                className="w-full sm:w-auto rounded-xl bg-lime px-6 py-2.5 text-xs font-black text-ink hover:opacity-90 transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMDb & Web Metadata Search Modal ────────────────────────────── */}
      {showImdbModal && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-white/15 bg-[#0e1117] p-5 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-white/10 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 text-white">
                <Star size={22} className="text-amber-400" fill="currentColor" />
                <div>
                  <h3 className="text-lg sm:text-xl font-black">Search IMDb &amp; Metadata</h3>
                  <p className="text-xs text-zinc-400">
                    Find official posters, ratings, release years, cast, and music albums live.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImdbModal(false);
                  setImdbResults([]);
                }}
                className="rounded-lg p-1.5 text-zinc-500 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target File Selector (if multiple files exist) */}
            {allFiles.length > 0 && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                  Target File to Update:
                </label>
                <select
                  value={selectedFileForMatch?.id || ""}
                  onChange={(e) => {
                    const target = allFiles.find((f) => f.id === e.target.value);
                    if (target) setSelectedFileForMatch(target);
                  }}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                >
                  {allFiles.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.ext.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input Box */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  value={imdbQuery}
                  onChange={(e) => {
                    setImdbQuery(e.target.value);
                    handleSearchImdb(e.target.value);
                  }}
                  placeholder={
                    tab === "movies"
                      ? "Search IMDb (e.g. Inception, The Batman, Dune)..."
                      : "Search Songs / Music (e.g. Shape of You, Interstellar OST)..."
                  }
                  className="w-full rounded-2xl border border-white/10 bg-zinc-900 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  autoFocus
                />
              </div>
              <button
                onClick={() => handleSearchImdb(imdbQuery)}
                className="flex items-center gap-1.5 rounded-2xl bg-amber-400 px-5 py-3 text-xs font-black text-ink hover:opacity-90 transition shrink-0"
              >
                {searchingImdb ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Search size={15} />
                )}
                Search
              </button>
            </div>

            {/* Search Results List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
              {searchingImdb && (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-500">
                  <Loader2 size={24} className="animate-spin mb-2 text-amber-400" />
                  <span className="text-xs">Searching IMDb &amp; Web catalog...</span>
                </div>
              )}

              {!searchingImdb && imdbResults.length === 0 && (
                <div className="text-center py-10 text-xs text-zinc-500">
                  {imdbQuery
                    ? "No exact matches found on IMDb. Try typing a simpler movie/song title."
                    : "Type a title above to search official IMDb and iTunes databases."}
                </div>
              )}

              {!searchingImdb &&
                imdbResults.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[.02] p-3 hover:border-amber-400/40 hover:bg-white/[.04] transition group"
                  >
                    {/* Poster / Artwork */}
                    <div className="h-16 w-12 shrink-0 rounded-lg overflow-hidden bg-zinc-900 border border-white/10 flex items-center justify-center">
                      {item.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Film size={20} className="text-zinc-700" />
                      )}
                    </div>

                    {/* Metadata Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-white truncate">{item.title}</h5>
                        {item.year && (
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300">
                            {item.year}
                          </span>
                        )}
                      </div>

                      {item.actors && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          <span className="text-zinc-500">Cast: </span>
                          {item.actors}
                        </p>
                      )}

                      {item.artist && (
                        <p className="text-xs text-zinc-400 truncate mt-0.5">
                          <span className="text-zinc-300 font-medium">{item.artist}</span>
                          {item.album && <span className="text-zinc-500"> · {item.album}</span>}
                        </p>
                      )}
                    </div>

                    {/* Actions: View on IMDb + Apply Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {item.imdbUrl && (
                        <a
                          href={item.imdbUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:bg-amber-400/20 hover:text-amber-400 transition"
                          title="Open on IMDb"
                        >
                          <Star size={11} />
                          <span>IMDb</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </a>
                      )}

                      <button
                        onClick={() => handleApplyMetadata(item)}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-black text-ink hover:opacity-90 transition shadow-md"
                      >
                        <Check size={13} strokeWidth={3} />
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            <div className="flex justify-end border-t border-white/10 pt-3">
              <button
                onClick={() => {
                  setShowImdbModal(false);
                  setImdbResults([]);
                }}
                className="rounded-xl border border-white/10 bg-white/[.04] px-5 py-2 text-xs font-bold text-zinc-300 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
