"use client";

/**
 * LocalVideoPlayer — Cinema-grade fullscreen HTML5 video player
 * Features:
 *  - Auto Fullscreen request on play
 *  - Double-click to toggle fullscreen
 *  - Rich Movie Metadata display (plot synopsis, year, rating, poster)
 *  - HTTP 206 Range seeking with buffered progress bar
 *  - Speed selector (0.5×–2×), ±10s skip, keyboard shortcuts (Space, F, M, Arrows)
 *  - External VLC fallback for unsupported formats
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Info,
  Maximize, Minimize, Pause, Play, RotateCcw, Settings, SkipBack,
  SkipForward, Star, Volume2, VolumeX, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaFile } from "@/lib/media-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  file: MediaFile;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocalVideoPlayer({ file, onClose, onPrev, onNext }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | "center" }>({ time: 0, side: "center" });

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCtrl, setShowCtrl] = useState(true);
  const [showSpeed, setShowSpeed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [error, setError] = useState("");
  const [audioBlocked, setAudioBlocked] = useState(false);

  // Touch double-tap ripple indicators
  const [rippleLeft, setRippleLeft] = useState(false);
  const [rippleRight, setRippleRight] = useState(false);

  const meta = file.metadata;
  const streamUrl = file.customBlobUrl || `/api/media/stream?p=${file.id}`;

  // ── Show/hide controls on movement ────────────────────────────────────────
  const revealControls = useCallback(() => {
    setShowCtrl(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 4000);
    }
  }, [playing]);

  // ── Unmute and Enable Audio explicitly ────────────────────────────────────
  const enableAudio = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    setMuted(false);
    setVolume(1);
    setAudioBlocked(false);
  }, []);

  // ── Playback toggle ───────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      // User gesture enables sound safely
      v.muted = false;
      setMuted(false);
      v.play().catch(() => {
        // If unmuted autoplay blocked, try muted and notify
        v.muted = true;
        setMuted(true);
        setAudioBlocked(true);
        v.play().catch(() => {});
      });
    } else {
      v.pause();
    }
  }, []);

  // ── Skip ±seconds with visual ripple ──────────────────────────────────────
  const skip = useCallback(
    (sec: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(duration || 10000, v.currentTime + sec));
      setCurrentTime(v.currentTime);

      if (sec < 0) {
        setRippleLeft(true);
        setTimeout(() => setRippleLeft(false), 650);
      } else {
        setRippleRight(true);
        setTimeout(() => setRippleRight(false), 650);
      }
      revealControls();
    },
    [duration, revealControls]
  );

  // ── Touch Gesture Handler (Double tap to skip / rewind) ───────────────────
  const handleTouchZone = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;
    const now = Date.now();

    const isLeft = x < width * 0.38;
    const isRight = x > width * 0.62;
    const side: "left" | "right" | "center" = isLeft ? "left" : isRight ? "right" : "center";

    const last = lastTapRef.current;
    const isDoubleTap = now - last.time < 320 && last.side === side;

    if (isDoubleTap) {
      if (side === "left") {
        skip(-10);
      } else if (side === "right") {
        skip(10);
      } else {
        togglePlay();
      }
      lastTapRef.current = { time: 0, side: "center" };
    } else {
      lastTapRef.current = { time: now, side };
      // Single tap after delay toggles controls
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 320 && lastTapRef.current.time !== 0) {
          setShowCtrl((prev) => !prev);
        }
      }, 330);
    }
  };

  // ── Auto fullscreen attempt on mount ────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (el && !document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    }
    // Attempt auto play with audio
    const v = videoRef.current;
    if (v) {
      v.volume = 1;
      v.muted = false;
      v.play().catch(() => {
        // Autoplay policy prevented audio, try muted
        v.muted = true;
        setMuted(true);
        setAudioBlocked(true);
        v.play().catch(() => {});
      });
    }
  }, []);

  // ── Video event handlers ──────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => {
      setPlaying(true);
      if (!v.muted && v.volume > 0) setAudioBlocked(false);
    };
    const onPause = () => {
      setPlaying(false);
      setShowCtrl(true);
    };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onMeta = () => {
      setDuration(v.duration);
      v.volume = 1;
    };
    const onVolume = () => {
      setVolume(v.volume);
      setMuted(v.muted || v.volume === 0);
      if (!v.muted && v.volume > 0) setAudioBlocked(false);
    };
    const onErr = () => setError("Cannot play this file directly in browser. Try 'Open in VLC'.");

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("volumechange", onVolume);
    v.addEventListener("error", onErr);

    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("volumechange", onVolume);
      v.removeEventListener("error", onErr);
    };
  }, [file.id]);

  // ── Fullscreen sync ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          skip(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          skip(10);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((prev) => {
            const nv = Math.min(1, prev + 0.1);
            if (v) {
              v.volume = nv;
              v.muted = false;
            }
            return nv;
          });
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((prev) => {
            const nv = Math.max(0, prev - 0.1);
            if (v) v.volume = nv;
            return nv;
          });
          break;
        case "m":
          toggleMute();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "i":
          setShowInfo((prev) => !prev);
          break;
        case "escape":
          if (!document.fullscreenElement) onClose();
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, volume, muted, duration, skip, togglePlay]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
    if (muted) {
      v.volume = 1;
      setVolume(1);
      setAudioBlocked(false);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = Number(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
    setMuted(vol === 0);
    if (vol > 0) setAudioBlocked(false);
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    setSpeed(s);
    setShowSpeed(false);
  };

  const vlcUrl = `vlc://${streamUrl}`;
  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden select-none w-screen h-screen min-h-[100dvh] max-h-[100dvh]"
      onMouseMove={revealControls}
    >
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-30 flex items-center gap-3 bg-gradient-to-b from-black/95 via-black/60 to-transparent px-4 sm:px-6 py-3 sm:py-4 transition-opacity duration-300",
          showCtrl ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        <button
          onClick={onClose}
          className="grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition active:scale-95 shrink-0"
          aria-label="Close Player"
        >
          <X size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm sm:text-base font-black text-white">
              {meta?.cleanTitle || file.name}
            </p>
            {meta?.year && (
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-zinc-300 shrink-0">
                {meta.year}
              </span>
            )}
            {meta?.rating && (
              <span className="hidden sm:flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-black text-amber-400 shrink-0">
                <Star size={11} fill="currentColor" />
                {meta.rating}
              </span>
            )}
          </div>
          <p className="truncate text-[10px] sm:text-[11px] text-zinc-400 font-mono">
            {file.ext.toUpperCase().slice(1)} · {file.sizeFormatted}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {meta?.imdbUrl && (
            <a
              href={meta.imdbUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-xl bg-amber-400/15 border border-amber-400/30 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold text-amber-400 hover:bg-amber-400/25 transition shrink-0"
              title="Open on IMDb"
            >
              <Star size={13} fill="currentColor" />
              <span className="hidden md:inline">IMDb</span>
            </a>
          )}

          <button
            onClick={() => setShowInfo((prev) => !prev)}
            className={cn(
              "flex items-center gap-1 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-bold transition shrink-0",
              showInfo ? "bg-lime text-ink" : "bg-white/10 text-white hover:bg-white/20",
            )}
            title="Movie Overview & Metadata (Key: I)"
          >
            <Info size={14} />
            <span className="hidden md:inline">Info</span>
          </button>

          {onPrev && (
            <button
              onClick={onPrev}
              className="hidden sm:grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Previous Movie"
            >
              <SkipBack size={15} />
            </button>
          )}

          {onNext && (
            <button
              onClick={onNext}
              className="hidden sm:grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
              title="Next Movie"
            >
              <SkipForward size={15} />
            </button>
          )}

          <a
            href={vlcUrl}
            className="flex items-center gap-1 rounded-xl bg-orange-500/20 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-orange-400 hover:bg-orange-500/30 transition shrink-0"
            title="Open in Desktop VLC Media Player"
          >
            <ExternalLink size={13} />
            <span className="hidden md:inline">Open in VLC</span>
          </a>
        </div>
      </div>

      {/* ── Video Viewport with Touch Gestures ────────────────────────── */}
      <div
        className="relative flex-1 flex items-center justify-center bg-black overflow-hidden touch-none"
        onTouchEnd={handleTouchZone}
        onClick={(e) => {
          // On desktop, click toggles play
          if (!("ontouchstart" in window)) {
            togglePlay();
          }
        }}
        onDoubleClick={toggleFullscreen}
        style={{ cursor: showCtrl || !playing ? "default" : "none" }}
      >
        {/* Error Fallback */}
        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-center p-6 bg-black/90">
            <AlertTriangle size={52} className="text-red-400 animate-bounce" />
            <p className="text-base font-bold text-white max-w-md">{error}</p>
            <a
              href={vlcUrl}
              className="flex items-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white hover:bg-orange-600 transition"
            >
              <ExternalLink size={16} /> Open in VLC Media Player
            </a>
          </div>
        )}

        <video
          ref={videoRef}
          src={streamUrl}
          className="h-full w-full object-contain pointer-events-none"
          preload="auto"
          playsInline
        />

        {/* Double Tap Rewind Visual Ripple (Left Screen) */}
        {rippleLeft && (
          <div className="absolute left-8 sm:left-16 z-20 flex flex-col items-center justify-center rounded-full bg-white/20 p-6 backdrop-blur-md animate-ping pointer-events-none">
            <RotateCcw size={32} className="text-white mb-1" />
            <span className="text-sm font-black text-white font-mono">-10s</span>
          </div>
        )}

        {/* Double Tap Skip Visual Ripple (Right Screen) */}
        {rippleRight && (
          <div className="absolute right-8 sm:right-16 z-20 flex flex-col items-center justify-center rounded-full bg-white/20 p-6 backdrop-blur-md animate-ping pointer-events-none">
            <SkipForward size={32} className="text-white mb-1" />
            <span className="text-sm font-black text-white font-mono">+10s</span>
          </div>
        )}

        {/* Audio Muted / Autoplay Blocked Warning Banner */}
        {(audioBlocked || muted) && playing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              enableAudio();
            }}
            className="absolute top-20 z-20 flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-black text-ink shadow-2xl hover:scale-105 active:scale-95 transition animate-bounce"
          >
            <VolumeX size={16} />
            <span>Tap to Enable Audio / Unmute 🔊</span>
          </button>
        )}

        {/* Big Center Play Overlay (Paused state) */}
        {!playing && !error && (
          <div className="absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 pointer-events-auto">
            {/* Quick Rewind 10s */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                skip(-10);
              }}
              className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-white/20 transition active:scale-90"
              title="Rewind 10s"
            >
              <RotateCcw size={22} />
              <span className="text-[9px] font-black font-mono">10</span>
            </button>

            {/* Main Play */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="grid h-20 w-20 sm:h-24 sm:w-24 place-items-center rounded-full bg-lime text-ink shadow-2xl hover:scale-105 active:scale-90 transition"
              title="Play"
            >
              <Play size={36} fill="currentColor" className="ml-1 sm:size-10" />
            </button>

            {/* Quick Forward 10s */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                skip(10);
              }}
              className="grid h-12 w-12 sm:h-16 sm:w-16 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-white/20 transition active:scale-90"
              title="Forward 10s"
            >
              <SkipForward size={22} />
              <span className="text-[9px] font-black font-mono">10</span>
            </button>
          </div>
        )}

        {/* ── Movie Metadata Info Overlay Panel (Toggled with 'I') ──────── */}
        {showInfo && meta && (
          <div
            className="absolute top-20 right-6 z-30 max-w-md rounded-3xl border border-white/10 bg-black/90 p-6 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-lg font-black text-white">{meta.cleanTitle || file.name}</h4>
                <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                  {meta.year && <span>{meta.year}</span>}
                  {meta.rating && (
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      ★ {meta.rating}
                    </span>
                  )}
                  <span>· {file.ext.toUpperCase()}</span>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="rounded-lg p-1 text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {meta.actors && (
              <p className="mt-2 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-200">Starring: </span>
                {meta.actors}
              </p>
            )}

            {meta.overview && (
              <p className="mt-3 text-xs leading-relaxed text-zinc-300 max-h-44 overflow-y-auto">
                {meta.overview}
              </p>
            )}

            {meta.imdbUrl && (
              <div className="mt-4">
                <a
                  href={meta.imdbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/15 border border-amber-400/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-400/25 transition"
                >
                  <Star size={12} fill="currentColor" />
                  <span>View Details on IMDb</span>
                  <ExternalLink size={11} className="ml-0.5 opacity-60" />
                </a>
              </div>
            )}

            <div className="mt-4 border-t border-white/10 pt-3 text-[11px] text-zinc-500 font-mono space-y-1">
              <p className="truncate">File: {file.filename}</p>
              <p>Size: {file.sizeFormatted}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Controls ───────────────────────────────────────────── */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-6 pb-5 pt-12 transition-opacity duration-300",
          showCtrl ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek Bar */}
        <div
          className="relative mb-4 h-2 rounded-full bg-white/15 cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            const v = videoRef.current;
            if (v && duration) {
              v.currentTime = pct * duration;
              setCurrentTime(pct * duration);
            }
          }}
        >
          {/* Buffered Track */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-white/25"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Progress Track */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-lime shadow-lg shadow-lime/50"
            style={{ width: `${progressPct}%` }}
          />
          {/* Hover Knob */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPct}% - 8px)` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="grid h-10 w-10 place-items-center rounded-xl bg-lime text-ink hover:scale-105 transition active:scale-95 shadow-md shadow-lime/20"
          >
            {playing ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Skip -10s */}
          <button
            onClick={() => skip(-10)}
            className="text-zinc-300 hover:text-white transition"
            title="Rewind 10s (←)"
          >
            <RotateCcw size={20} />
          </button>

          {/* Skip +10s */}
          <button
            onClick={() => skip(10)}
            className="text-zinc-300 hover:text-white transition"
            title="Forward 10s (→)"
          >
            <ChevronRight size={20} />
          </button>

          {/* Timestamp */}
          <span className="text-xs font-mono text-zinc-300 select-none">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition">
              {muted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className="w-20 accent-lime cursor-pointer hidden sm:block"
            />
          </div>

          {/* Playback Speed */}
          <div className="relative">
            <button
              onClick={() => setShowSpeed(!showSpeed)}
              className="flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition"
            >
              <Settings size={13} /> {speed}×
            </button>
            {showSpeed && (
              <div className="absolute bottom-full right-0 mb-2 rounded-2xl border border-white/10 bg-zinc-900 py-1.5 shadow-2xl">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => changeSpeed(s)}
                    className={cn(
                      "block w-full px-4 py-1.5 text-left text-xs font-bold transition hover:bg-white/5",
                      s === speed ? "text-lime" : "text-zinc-300",
                    )}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            title="Toggle Fullscreen (F)"
          >
            {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>

        {/* Keyboard Hints */}
        <p className="mt-3 text-center text-[11px] text-zinc-600 font-medium">
          Space · Play/Pause &nbsp;·&nbsp; F · Fullscreen &nbsp;·&nbsp; ← → · Seek 10s &nbsp;·&nbsp; M · Mute &nbsp;·&nbsp; I · Info &nbsp;·&nbsp; Esc · Close
        </p>
      </div>
    </div>
  );
}
