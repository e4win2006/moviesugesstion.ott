"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Film,
  Tv,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  BookOpen,
  Layers,
  Activity,
  Globe,
  Loader2,
  Search as SearchIcon,
  RotateCcw,
  Volume1,
} from "lucide-react";

interface HlsInstance {
  loadSource(src: string): void;
  attachMedia(media: HTMLMediaElement): void;
  on(event: string, callback: () => void): void;
  destroy(): void;
}

interface HlsConstructor {
  new (): HlsInstance;
  isSupported(): boolean;
  Events: {
    MANIFEST_PARSED: string;
  };
}

export default function VLCWebPlayerPage() {
  // Navigation Source State
  const [mediaType, setMediaType] = useState<"movie" | "tv" | "iptv" | "custom">("iptv");
  
  // Custom VLC Player States
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamTitle, setStreamTitle] = useState("France 24 Live");
  const [autoPlay, setAutoPlay] = useState(false);

  // Movies & TV States (Embed mode)
  const [movieTmdbId, setMovieTmdbId] = useState("1078605");
  const [tvTmdbId, setTvTmdbId] = useState("119051");
  const [season, setSeason] = useState("1");
  const [episode, setEpisode] = useState("8");
  const [embedProvider, setEmbedProvider] = useState("vidlink"); // vidlink, vidsrc

  // IPTV & Custom Stream States
  const [iptvStreamUrl, setIptvStreamUrl] = useState("https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8");
  const [customStreamUrl, setCustomStreamUrl] = useState("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
  const [allIptvStreams, setAllIptvStreams] = useState<{ channel: string; url: string; status: string }[]>([]);
  const [loadingIptv, setLoadingIptv] = useState(false);
  const [iptvSearchQuery, setIptvSearchQuery] = useState("");
  const [iptvError, setIptvError] = useState("");

  const popularIptvChannels = [
    { name: "France 24 English", url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8" },
    { name: "Bloomberg TV US", url: "https://liveproduseast.global.ssl.fastly.net/mic/24x7_live_1080p.m3u8" },
    { name: "DW English", url: "https://dwstream4-lh.akamaihd.net/i/dwstream4_live@131329/index_1_av-b.m3u8" },
    { name: "NASA TV HD", url: "https://ntv1.nasatv.splitmediahe.com/hls/ntv1_1080p.m3u8" },
    { name: "ABC News Live", url: "https://content.uplynk.com/channel/3324f2467c194a7c93d0355759c3c458.m3u8" },
    { name: "Sky News Live", url: "https://skynews-live.akamaized.net/hls/live/2006734/skynews/master.m3u8" },
    { name: "Red Bull TV", url: "https://rbmn-live.akamaized.net/hls/live/590964/sports1/master.m3u8" },
  ];

  // Copy Feedback State
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

  const triggerCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Read URL query parameters on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const typeParam = params.get("type");
    const tmdbIdParam = params.get("tmdbId");
    const seasonParam = params.get("season");
    const episodeParam = params.get("episode");
    const iptvUrlParam = params.get("iptvUrl");
    const customUrlParam = params.get("customUrl");

    if (typeParam === "movie" || typeParam === "tv" || typeParam === "iptv" || typeParam === "custom") {
      setMediaType(typeParam as "movie" | "tv" | "iptv" | "custom");
    }
    if (tmdbIdParam) {
      if (typeParam === "tv") {
        setTvTmdbId(tmdbIdParam);
      } else {
        setMovieTmdbId(tmdbIdParam);
      }
    }
    if (seasonParam) setSeason(seasonParam);
    if (episodeParam) setEpisode(episodeParam);
    if (iptvUrlParam) {
      setIptvStreamUrl(iptvUrlParam);
      setStreamTitle("URL Stream Feed");
    }
    if (customUrlParam) {
      setCustomStreamUrl(customUrlParam);
      setStreamTitle("Custom Stream");
    }
  }, []);

  // Dynamically load HLS.js CDN script
  useEffect(() => {
    const customWindow = window as unknown as { Hls?: HlsConstructor };
    if (typeof window !== "undefined" && !customWindow.Hls) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/hls.js@latest";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  // Determine current active direct stream source URL
  const activeStreamUrl = mediaType === "iptv" ? iptvStreamUrl : customStreamUrl;

  // Initialize HLS.js or native HTML5 playback inside custom VLC player
  useEffect(() => {
    if (mediaType !== "iptv" && mediaType !== "custom") return;
    const video = videoRef.current;
    if (!video) return;

    let hls: HlsInstance | null = null;
    const customWindow = window as unknown as { Hls?: HlsConstructor };
    const Hls = customWindow.Hls;

    setIsPlaying(false);

    if (Hls && Hls.isSupported() && activeStreamUrl.includes(".m3u8")) {
      hls = new Hls();
      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    } else {
      // Fallback for native browsers supporting .m3u8 (like Safari) or standard MP4 feeds
      video.src = activeStreamUrl;
      const playHandler = () => {
        video.play().then(() => setIsPlaying(true)).catch(() => {});
        video.removeEventListener("loadedmetadata", playHandler);
      };
      video.addEventListener("loadedmetadata", playHandler);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [mediaType, activeStreamUrl]);

  // Sync Video Controls & Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [mediaType, activeStreamUrl]);

  // Sync fullscreen change key triggers
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Custom Video Player Controls Logic
  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const handleStop = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const vol = Number(e.target.value);
    setVolume(vol);
    video.volume = vol;
    video.muted = vol === 0;
    setIsMuted(vol === 0);
  };

  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    video.muted = nextMuted;
    if (nextMuted) {
      video.volume = 0;
    } else {
      video.volume = volume;
    }
  };

  const handleFullscreenToggle = () => {
    const container = document.getElementById("vlc-player-frame");
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Load 10,000+ streams from iptv-org/api
  const loadAllIptvChannels = async () => {
    setLoadingIptv(true);
    setIptvError("");
    try {
      const res = await fetch("https://iptv-org.github.io/api/streams.json");
      if (!res.ok) throw new Error("Could not retrieve stream database.");
      const data = (await res.json()) as { channel: string; url: string; status: string }[];
      // Filter for active .m3u8 live feeds
      const liveFeeds = data.filter(
        (s) => s.status === "online" && s.url && s.url.includes(".m3u8")
      );
      setAllIptvStreams(liveFeeds);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error fetching iptv channels.";
      setIptvError(errMsg);
    } finally {
      setLoadingIptv(false);
    }
  };

  // Format time (seconds -> HH:MM:SS / MM:SS)
  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "00:00";
    const hrs = Math.floor(time / 3600);
    const mins = Math.floor((time % 3600) / 60);
    const secs = Math.floor(time % 60);

    const pad = (num: number) => String(num).padStart(2, "0");

    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Build TMDB embed URL based on selected provider
  const getEmbedUrl = () => {
    if (mediaType === "movie") {
      return embedProvider === "vidlink"
        ? `https://vidlink.pro/embed/movie/${movieTmdbId}`
        : `https://vidsrc.to/embed/movie/${movieTmdbId}`;
    } else if (mediaType === "tv") {
      return embedProvider === "vidlink"
        ? `https://vidlink.pro/embed/tv/${tvTmdbId}/${season}/${episode}`
        : `https://vidsrc.to/embed/tv/${tvTmdbId}/${season}/${episode}`;
    }
    return "";
  };

  const embedUrl = getEmbedUrl();

  const generatedCode = mediaType === "iptv" || mediaType === "custom"
    ? `<video src="${activeStreamUrl}" width="100%" height="450" controls></video>`
    : `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  // Search filter
  const filteredIptvStreams = allIptvStreams
    .filter((s) => s.channel.toLowerCase().includes(iptvSearchQuery.toLowerCase()))
    .slice(0, 30);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-b from-orange-500/10 via-zinc-950/20 to-transparent py-16 text-center sm:py-24">
        <div className="absolute top-0 -z-10 h-72 w-72 rounded-full bg-orange-500/10 blur-[80px]" />
        
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-4 py-1.5 text-xs font-semibold text-orange-400">
          {/* VLC style cone branding */}
          <svg viewBox="0 0 48 48" className="h-4.5 w-4.5">
            <path d="M24,4 L16,36 L32,36 Z" fill="#FF8800" />
            <path d="M19.5,18 L28.5,18 L27.25,23 L20.75,23 Z" fill="#FFFFFF" />
            <path d="M17.5,28 L30.5,28 L29.25,33 L18.75,33 Z" fill="#FFFFFF" />
            <ellipse cx="24" cy="37" rx="18" ry="4" fill="#FF8800" />
          </svg>
          <span>VLC Web Player Workspace</span>
        </div>

        <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl text-white">
          VLC Web Player
        </h1>
        <p className="mt-4 max-w-xl text-lg font-medium text-zinc-400">
          Play live IPTV streams, custom video URLs, and movies.
          <br className="hidden sm:inline" /> Built from scratch utilizing native HLS engine decoding.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => scrollToSection("tester")}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-black text-white hover:bg-orange-600 transition"
          >
            <Play size={16} fill="currentColor" /> Open Player
          </button>
          <button
            onClick={() => scrollToSection("documentation")}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3.5 text-sm font-black hover:bg-white/[0.08] transition text-white"
          >
            <BookOpen size={16} /> Reference Docs
          </button>
        </div>
      </section>

      {/* Core Features Overview */}
      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Play Anything",
            desc: "Full support for live IPTV feeds (.m3u8), raw video URLs (MP4, WebM), and external streaming backends.",
            icon: Layers,
          },
          {
            title: "Custom Player Controls",
            desc: "Features seekable scrubbers, live time formats, mute toggles,Stop buttons, and native fullscreen support.",
            icon: Sliders,
          },
          {
            title: "10K+ IPTV Channels",
            desc: "Direct integration with the iptv-org/api streaming list. Search and play channels on demand.",
            icon: Globe,
          },
        ].map((feat, idx) => (
          <div key={idx} className="glass rounded-2xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 h-24 w-24 bg-orange-500/5 rounded-bl-[100px] -z-10 group-hover:bg-orange-500/10 transition-colors" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400 mb-4">
              <feat.icon size={20} />
            </span>
            <h3 className="text-lg font-bold text-white">{feat.title}</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>

      {/* VLC Player and Controls Interface */}
      <section id="tester" className="scroll-mt-24 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">VLC Media Terminal</h2>
            <p className="text-sm text-zinc-400 mt-1">Configure sources on the right and control playback in the panel below.</p>
          </div>
          
          <div className="flex items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/5 p-1 text-[11px] font-bold text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-orange-500" />
            VLC Web Engine
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* VLC Styled Video Player (Left Column) */}
          <div className="space-y-6 lg:col-span-7">
            {/* VLC Player Frame */}
            <div
              id="vlc-player-frame"
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-[#0e0e11] shadow-2xl transition"
            >
              {/* VLC Top Window Title Bar */}
              <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400">
                <span className="flex items-center gap-2 truncate">
                  {/* VLC Cone SVG */}
                  <svg viewBox="0 0 48 48" className="h-4 w-4 shrink-0">
                    <path d="M24,4 L16,36 L32,36 Z" fill="#FF8800" />
                    <path d="M19.5,18 L28.5,18 L27.25,23 L20.75,23 Z" fill="#FFFFFF" />
                    <path d="M17.5,28 L30.5,28 L29.25,33 L18.75,33 Z" fill="#FFFFFF" />
                    <ellipse cx="24" cy="37" rx="18" ry="4" fill="#FF8800" />
                  </svg>
                  <span>VLC Media Player - {streamTitle}</span>
                </span>
                
                {/* Embed Open full option */}
                {(mediaType === "movie" || mediaType === "tv") && (
                  <a
                    href={embedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[10px] text-orange-400 hover:underline"
                  >
                    Open Source <ExternalLink size={10} />
                  </a>
                )}
              </div>

              {/* Player Viewport */}
              <div className="relative aspect-video w-full bg-black flex items-center justify-center">
                {mediaType === "movie" || mediaType === "tv" ? (
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 h-full w-full border-0"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  />
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="absolute inset-0 h-full w-full object-contain"
                      playsInline
                    />
                    
                    {/* VLC Orange Loading Overlay */}
                    {!isPlaying && currentTime === 0 && (
                      <button
                        onClick={handlePlayPause}
                        className="absolute grid h-16 w-16 place-items-center rounded-full bg-orange-500 text-white shadow-xl hover:scale-105 active:scale-95 transition z-10"
                        aria-label="Play Stream"
                      >
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Custom VLC Bottom Toolbar (Only for direct streams: IPTV and Custom URLs) */}
              {(mediaType === "iptv" || mediaType === "custom") && (
                <div className="bg-zinc-950 px-4 py-3 space-y-2.5 border-t border-zinc-900">
                  {/* Custom Progress/Seek range bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-zinc-500 select-none">
                      {formatTime(currentTime)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 1}
                      value={currentTime}
                      onChange={handleSeek}
                      disabled={mediaType === "iptv" && duration === 0} // disable seek if live stream feed
                      className="h-1 flex-1 cursor-pointer rounded-lg bg-zinc-800 appearance-none accent-orange-500"
                    />
                    <span className="text-[10px] font-mono text-zinc-500 select-none">
                      {mediaType === "iptv" && duration === 0 ? (
                        <span className="text-orange-500 font-bold flex items-center gap-1 animate-pulse">
                          ● LIVE
                        </span>
                      ) : (
                        formatTime(duration)
                      )}
                    </span>
                  </div>

                  {/* VLC Controls row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {/* Play/Pause */}
                      <button
                        onClick={handlePlayPause}
                        className="grid h-8.5 w-8.5 place-items-center rounded bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 hover:text-orange-400 transition"
                        title={isPlaying ? "Pause" : "Play"}
                      >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                      </button>
                      
                      {/* Stop */}
                      <button
                        onClick={handleStop}
                        className="grid h-8.5 w-8.5 place-items-center rounded bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 hover:text-orange-400 transition"
                        title="Stop"
                      >
                        <span className="h-2.5 w-2.5 bg-current rounded-sm" />
                      </button>

                      {/* Reset stream */}
                      <button
                        onClick={() => {
                          const v = videoRef.current;
                          if (v) {
                            v.load();
                            setIsPlaying(false);
                          }
                        }}
                        className="grid h-8.5 w-8.5 place-items-center rounded bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800 hover:text-orange-400 transition"
                        title="Reset Stream Decoder"
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Volume Slider */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleMuteToggle}
                          className="text-zinc-400 hover:text-orange-400 transition"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted ? (
                            <VolumeX size={15} />
                          ) : volume > 0.5 ? (
                            <Volume2 size={15} />
                          ) : volume > 0 ? (
                            <Volume1 size={15} />
                          ) : (
                            <VolumeX size={15} />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolume}
                          className="w-16 h-1 cursor-pointer bg-zinc-800 rounded appearance-none accent-orange-500"
                        />
                      </div>

                      {/* Divider */}
                      <span className="h-4 w-px bg-zinc-800" />

                      {/* Fullscreen */}
                      <button
                        onClick={handleFullscreenToggle}
                        className="text-zinc-400 hover:text-orange-400 transition"
                        title="Toggle Fullscreen"
                      >
                        {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generated Stream URLs Display */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stream Sharing & Embed</h3>
              
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-500">
                      {mediaType === "movie" || mediaType === "tv" ? "Embed Frame URL:" : "Direct Stream Source URL:"}
                    </label>
                    <button
                      onClick={() => triggerCopy("url", mediaType === "movie" || mediaType === "tv" ? embedUrl : activeStreamUrl)}
                      className="flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:opacity-80 transition"
                    >
                      {copiedStates["url"] ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl bg-black/40 px-3.5 py-3.5 font-mono text-xs text-zinc-300 break-all select-all border border-white/5">
                    {mediaType === "movie" || mediaType === "tv" ? embedUrl : activeStreamUrl}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-zinc-500">HTML Code Code snippet:</label>
                    <button
                      onClick={() => triggerCopy("html", generatedCode)}
                      className="flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:opacity-80 transition"
                    >
                      {copiedStates["html"] ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl bg-black/40 px-3.5 py-3.5 font-mono text-xs text-zinc-300 break-words select-all overflow-x-auto border border-white/5 whitespace-pre">
                    {generatedCode}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Playground Media Inputs Control Panel (Right Column) */}
          <div className="glass rounded-2xl p-6 space-y-6 lg:col-span-5">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest text-orange-400">Stream Controller</h3>
              <div className="mt-4 space-y-4">
                {/* Media Type Buttons */}
                <div>
                  <span className="block text-xs font-bold text-zinc-400 mb-2">Select Player Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMediaType("iptv")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border transition ${
                        mediaType === "iptv"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "border-white/5 hover:border-white/10 text-zinc-400"
                      }`}
                    >
                      <Activity size={12} /> Live IPTV
                    </button>
                    <button
                      onClick={() => setMediaType("custom")}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border transition ${
                        mediaType === "custom"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "border-white/5 hover:border-white/10 text-zinc-400"
                      }`}
                    >
                      <Globe size={12} /> Custom URL
                    </button>
                    <button
                      onClick={() => {
                        setMediaType("movie");
                        setStreamTitle("Movie Stream");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border transition ${
                        mediaType === "movie"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "border-white/5 hover:border-white/10 text-zinc-400"
                      }`}
                    >
                      <Film size={12} /> Movie Embed
                    </button>
                    <button
                      onClick={() => {
                        setMediaType("tv");
                        setStreamTitle("TV Series Stream");
                      }}
                      className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold border transition ${
                        mediaType === "tv"
                          ? "bg-orange-500/10 border-orange-500 text-orange-400"
                          : "border-white/5 hover:border-white/10 text-zinc-400"
                      }`}
                    >
                      <Tv size={12} /> TV Series Embed
                    </button>
                  </div>
                </div>

                {/* IPTV Media Settings */}
                {mediaType === "iptv" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="iptvUrl" className="block text-xs font-bold text-zinc-400 mb-2">Live HLS Stream URL (.m3u8)</label>
                      <input
                        id="iptvUrl"
                        type="text"
                        value={iptvStreamUrl}
                        onChange={(e) => {
                          setIptvStreamUrl(e.target.value);
                          setStreamTitle("URL Stream Feed");
                        }}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition font-mono"
                      />
                    </div>

                    {/* Pre-baked Live TV stations */}
                    <div>
                      <span className="block text-xs font-bold text-zinc-400 mb-2">Popular Live News Stations</span>
                      <div className="flex flex-wrap gap-1.5">
                        {popularIptvChannels.map((ch, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setIptvStreamUrl(ch.url);
                              setStreamTitle(ch.name);
                            }}
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition ${
                              iptvStreamUrl === ch.url
                                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                                : "border-white/5 bg-white/[0.01] hover:border-white/10 text-zinc-400"
                            }`}
                          >
                            {ch.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dynamic load of 10K database streams */}
                    <div className="border-t border-white/5 pt-4">
                      {allIptvStreams.length === 0 ? (
                        <button
                          onClick={loadAllIptvChannels}
                          disabled={loadingIptv}
                          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-xs font-bold text-zinc-300 transition disabled:opacity-50"
                        >
                          {loadingIptv ? (
                            <>
                              <Loader2 size={13} className="animate-spin" /> Fetching stream lists...
                            </>
                          ) : (
                            <>
                              <Globe size={13} /> Load 10,000+ Streams Database
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <label className="block text-xs font-bold text-zinc-400">Search Streams Database</label>
                          <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={13} />
                            <input
                              type="text"
                              value={iptvSearchQuery}
                              onChange={(e) => setIptvSearchQuery(e.target.value)}
                              placeholder="Search channels..."
                              className="w-full rounded-xl bg-black/40 border border-white/10 pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition"
                            />
                          </div>

                          <div className="max-h-48 overflow-y-auto rounded-lg border border-white/5 bg-black/20 divide-y divide-white/5 scrollbar-thin">
                            {filteredIptvStreams.length === 0 ? (
                              <p className="p-3 text-[11px] text-zinc-600 text-center">No matching channels.</p>
                            ) : (
                              filteredIptvStreams.map((s, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setIptvStreamUrl(s.url);
                                    setStreamTitle(s.channel);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition block truncate ${
                                    iptvStreamUrl === s.url ? "text-orange-400 font-bold bg-orange-500/5" : "text-zinc-400"
                                  }`}
                                >
                                  📺 {s.channel}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                      {iptvError && <p className="mt-2 text-xs text-red-400">{iptvError}</p>}
                    </div>
                  </div>
                )}

                {/* Custom URL Source Mode */}
                {mediaType === "custom" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="customUrl" className="block text-xs font-bold text-zinc-400 mb-2">Direct Video URL (.mp4, .webm, .m3u8)</label>
                      <input
                        id="customUrl"
                        type="text"
                        value={customStreamUrl}
                        onChange={(e) => {
                          setCustomStreamUrl(e.target.value);
                          setStreamTitle("Custom Stream Source");
                        }}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition font-mono"
                      />
                    </div>

                    <div>
                      <span className="block text-xs font-bold text-zinc-400 mb-2">Quick Test Sources</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setCustomStreamUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
                            setStreamTitle("Big Buck Bunny Trailer");
                          }}
                          className="rounded-lg p-2 text-[10px] border border-white/5 bg-white/[0.01] hover:border-white/10 text-zinc-400 transition"
                        >
                          🐰 Big Buck Bunny (MP4)
                        </button>
                        <button
                          onClick={() => {
                            setCustomStreamUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4");
                            setStreamTitle("Sintel Film Trailer");
                          }}
                          className="rounded-lg p-2 text-[10px] border border-white/5 bg-white/[0.01] hover:border-white/10 text-zinc-400 transition"
                        >
                          🐉 Sintel Video (MP4)
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Movie Embed Mode */}
                {mediaType === "movie" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="movieEmbedTmdb" className="block text-xs font-bold text-zinc-400 mb-2">Movie TMDB ID</label>
                      <input
                        id="movieEmbedTmdb"
                        type="text"
                        value={movieTmdbId}
                        onChange={(e) => setMovieTmdbId(e.target.value)}
                        placeholder="e.g. 1078605"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition font-mono"
                      />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-400 mb-2">Embed Provider Engine</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["vidlink", "vidsrc"].map((prov) => (
                          <button
                            key={prov}
                            onClick={() => setEmbedProvider(prov)}
                            className={`rounded-lg py-2 text-xs font-bold border transition capitalize ${
                              embedProvider === prov
                                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                                : "border-white/5 text-zinc-500"
                            }`}
                          >
                            {prov} player
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TV Embed Mode */}
                {mediaType === "tv" && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="tvEmbedTmdb" className="block text-xs font-bold text-zinc-400 mb-2">TV TMDB ID</label>
                      <input
                        id="tvEmbedTmdb"
                        type="text"
                        value={tvTmdbId}
                        onChange={(e) => setTvTmdbId(e.target.value)}
                        placeholder="e.g. 119051"
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="tvEmbedSeason" className="block text-xs font-bold text-zinc-400 mb-1.5">Season</label>
                        <input
                          id="tvEmbedSeason"
                          type="number"
                          min="1"
                          value={season}
                          onChange={(e) => setSeason(e.target.value)}
                          className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                        />
                      </div>
                      <div>
                        <label htmlFor="tvEmbedEpisode" className="block text-xs font-bold text-zinc-400 mb-1.5">Episode</label>
                        <input
                          id="tvEmbedEpisode"
                          type="number"
                          min="1"
                          value={episode}
                          onChange={(e) => setEpisode(e.target.value)}
                          className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-zinc-400 mb-2">Embed Provider Engine</span>
                      <div className="grid grid-cols-2 gap-2">
                        {["vidlink", "vidsrc"].map((prov) => (
                          <button
                            key={prov}
                            onClick={() => setEmbedProvider(prov)}
                            className={`rounded-lg py-2 text-xs font-bold border transition capitalize ${
                              embedProvider === prov
                                ? "bg-orange-500/10 border-orange-500 text-orange-400"
                                : "border-white/5 text-zinc-500"
                            }`}
                          >
                            {prov} player
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Play/Pause config */}
                <div className="border-t border-white/5 pt-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="mt-1 rounded border-white/10 bg-black/40 text-orange-500 focus:ring-0 focus:ring-offset-0"
                    />
                    <div>
                      <span className="block text-sm font-bold text-white">Auto Play Stream</span>
                      <span className="block text-xs text-zinc-500">Initiate playback immediately upon load</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VLC Player API Documentation */}
      <section id="documentation" className="scroll-mt-24 space-y-8 border-t border-white/5 pt-12">
        <div>
          <h2 className="text-2xl font-black text-white">VLC Web API Documentation</h2>
          <p className="text-sm text-zinc-400 mt-1">Direct stream parameters, HLS.js settings, and API list access endpoints.</p>
        </div>

        {/* Info Blocks */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Direct HLS Playback", desc: "Decodes Live IPTV stream feeds (.m3u8) on-the-fly using browser HLS buffers." },
            { title: "VLC Orange Theme UI", desc: "Custom controls built in Tailwind representing classic VLC player accents." },
            { title: "CORS Friendly", desc: "Fetches lists directly from IPTV-org Github repositories securely." },
            { title: "Copy-Ready Code", desc: "Easily generate clean HTML5 video tag or iframe embed blocks in one click." },
          ].map((item, idx) => (
            <div key={idx} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04]">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-orange-400 mb-3 text-xs font-black">
                {idx + 1}
              </span>
              <h4 className="text-sm font-bold text-white">{item.title}</h4>
              <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* API Routes */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-black text-white uppercase tracking-wider text-orange-400">Database Streams Endpoints</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-400">IPTV streams.json Database URL</span>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400">JSON</span>
              </div>
              <div className="rounded-xl bg-black/40 px-4 py-3.5 font-mono text-xs text-zinc-300 border border-white/5 break-all">
                https://iptv-org.github.io/api/streams.json
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-400">IPTV channels.json Metadata URL</span>
                <span className="rounded bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold text-orange-400">JSON</span>
              </div>
              <div className="rounded-xl bg-black/40 px-4 py-3.5 font-mono text-xs text-zinc-300 border border-white/5 break-all">
                https://iptv-org.github.io/api/channels.json
              </div>
            </div>
          </div>
        </div>

        {/* URL Parameters Table */}
        <div className="space-y-4">
          <h3 className="text-base font-black text-white uppercase tracking-wider text-orange-400">Query Parameters</h3>
          <div className="glass overflow-hidden rounded-2xl border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-zinc-400">
                <thead className="border-b border-white/5 bg-white/[0.02] text-xs font-bold uppercase tracking-wider text-zinc-300">
                  <tr>
                    <th className="px-5 py-4">Parameter</th>
                    <th className="px-5 py-4">Type</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { name: "type", type: "string", desc: "Set initial player mode (movie/tv/iptv/custom)", eg: "?type=iptv" },
                    { name: "iptvUrl", type: "string", desc: "Live HLS stream URL to autoplay", eg: "?type=iptv&iptvUrl=https://..." },
                    { name: "customUrl", type: "string", desc: "Direct MP4 or stream video URL", eg: "?type=custom&customUrl=https://..." },
                    { name: "tmdbId", type: "string", desc: "Load TMDB title for embed frames", eg: "?type=movie&tmdbId=157336" },
                  ].map((param, index) => (
                    <tr key={index} className="hover:bg-white/[0.01]">
                      <td className="px-5 py-4 font-mono font-bold text-white">{param.name}</td>
                      <td className="px-5 py-4 text-orange-400 font-mono">{param.type}</td>
                      <td className="px-5 py-4 text-zinc-300">{param.desc}</td>
                      <td className="px-5 py-4 font-mono text-zinc-500">{param.eg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Code Examples Section */}
      <section className="space-y-8 border-t border-white/5 pt-12">
        <div>
          <h2 className="text-2xl font-black text-white">Code Examples</h2>
          <p className="text-sm text-zinc-400 mt-1">VLC Web configurations and HTML embeds.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {[
            {
              title: "IPTV Live Channel Playback",
              desc: "Streaming public live news feed inside native HLS controller wrapper.",
              url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8",
              code: `<video src="https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8" width="100%" height="450" controls></video>`,
            },
            {
              title: "Standard MP4 Stream Playback",
              desc: "VLC styled progress seekbar playing direct video files.",
              url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
              code: `<video src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" width="100%" height="450" controls></video>`,
            },
          ].map((example, idx) => {
            const copyKey = `example_${idx}`;

            return (
              <div key={idx} className="glass rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white">{example.title}</h4>
                    <button
                      onClick={() => triggerCopy(copyKey, example.code)}
                      className="flex items-center gap-1 text-[11px] font-bold text-orange-400 hover:opacity-80 transition"
                    >
                      {copiedStates[copyKey] ? (
                        <>
                          <Check size={11} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={11} /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400">{example.desc}</p>
                </div>

                <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-black/60">
                  <video
                    src={example.url}
                    controls
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-8 text-center text-xs text-zinc-500">
        <p>© 2025 VLC Web Player. Built for seamless media streaming integration.</p>
      </footer>
    </div>
  );
}
