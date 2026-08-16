"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clapperboard, Compass, Film, HardDrive, History, Home, Import,
  Menu, Play, Search, Sparkles, UserRound, X, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const desktopNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/genres", label: "Genre & Rating", icon: Film },
  { href: "/new-ott", label: "New on OTT", icon: Clapperboard },
  { href: "/library", label: "My Library", icon: HardDrive },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/search", label: "Search", icon: Search },
  { href: "/player", label: "VLC Player", icon: Play },
  { href: "/history", label: "History", icon: History },
  { href: "/import", label: "Import", icon: Import },
  { href: "/profile", label: "Profile", icon: UserRound },
];

const mobileBottomNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/library", label: "Library", icon: HardDrive },
  { href: "/search", label: "Search", icon: Search },
];

const mobileMoreNav = [
  { href: "/genres", label: "Genre & Rating", icon: Film, desc: "Explore by genre, IMDb rating & year" },
  { href: "/new-ott", label: "New on OTT", icon: Clapperboard, desc: "Latest Netflix, Prime & Hotstar releases" },
  { href: "/player", label: "VLC Web Player", icon: Play, desc: "Direct desktop VLC video streaming" },
  { href: "/history", label: "Watch History", icon: History, desc: "Your completed & in-progress titles" },
  { href: "/import", label: "Import Catalog", icon: Import, desc: "Bulk import TMDb & local playlists" },
  { href: "/profile", label: "Family Profiles", icon: UserRound, desc: "Manage profile PINs and watch settings" },
];

export function AppShell({
  children,
  profileName,
}: {
  children: React.ReactNode;
  profileName: string;
}) {
  const pathname = usePathname();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const isMoreActive = mobileMoreNav.some((item) => pathname === item.href);

  return (
    <div className="min-h-screen flex flex-col bg-[#050608] text-white">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[.08] bg-ink/85 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-14 sm:h-16 max-w-[1500px] items-center justify-between gap-4 px-3 sm:px-7">
          {/* Logo & Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-2.5 group">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-lime text-ink shadow-md shadow-lime/20 group-hover:scale-105 transition">
              <Sparkles size={17} strokeWidth={2.7} />
            </span>
            <span className="text-sm font-extrabold tracking-tight sm:text-base">
              Family <span className="text-lime">Watch Advisor</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden flex-1 items-center gap-1 md:flex ml-4">
            {desktopNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                    active
                      ? "bg-white/[.12] text-white shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-white/[.05]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Top Right Quick Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition"
              aria-label="Search Catalog"
            >
              <Search size={16} />
            </Link>

            <Link
              href="/profile"
              className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-gradient-to-br from-lime to-emerald-500 text-xs font-black text-ink shadow-md shadow-lime/20 hover:scale-105 transition active:scale-95"
              title={`Logged in as ${profileName}`}
            >
              {profileName.charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-3 sm:px-7 pt-16 sm:pt-20 pb-[calc(5.5rem+env(safe-area-inset-bottom,16px))] md:pb-16">
        {children}
      </main>

      {/* ── Mobile Floating Bottom Navigation Bar ────────────────────────── */}
      <nav className="fixed inset-x-3 bottom-2.5 z-40 flex h-15 items-center justify-around rounded-2xl border border-white/12 bg-[#0c0f14]/90 px-1 py-1.5 shadow-2xl backdrop-blur-2xl md:hidden">
        {mobileBottomNav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-bold transition active:scale-90",
                active ? "text-lime font-black" : "text-zinc-400 hover:text-white",
              )}
            >
              <Icon size={19} className={cn("mb-0.5", active ? "text-lime stroke-[2.5]" : "")} />
              <span>{item.label}</span>
              {active && (
                <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-lime shadow-sm shadow-lime" />
              )}
            </Link>
          );
        })}

        {/* More Menu Drawer Trigger Button */}
        <button
          onClick={() => setShowMobileMenu((prev) => !prev)}
          className={cn(
            "relative flex flex-1 flex-col items-center justify-center py-1 text-[10px] font-bold transition active:scale-90",
            isMoreActive || showMobileMenu ? "text-lime font-black" : "text-zinc-400 hover:text-white",
          )}
        >
          {showMobileMenu ? <X size={19} className="mb-0.5" /> : <Menu size={19} className="mb-0.5" />}
          <span>More</span>
          {isMoreActive && (
            <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-lime shadow-sm shadow-lime" />
          )}
        </button>
      </nav>

      {/* ── Mobile More Slide-Up Menu Drawer ────────────────────────────── */}
      {showMobileMenu && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md md:hidden animate-fade-in"
          onClick={() => setShowMobileMenu(false)}
        >
          <div
            className="w-full rounded-t-3xl border-t border-white/15 bg-[#0f131a] p-5 pb-8 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Handle & Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime/20 text-lime">
                  <Menu size={15} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">More Sections</h3>
                  <p className="text-[11px] text-zinc-400">Explore all features &amp; tools</p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-zinc-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nav Items List */}
            <div className="grid grid-cols-1 gap-2">
              {mobileMoreNav.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={cn(
                      "flex items-center gap-3.5 rounded-2xl p-3 text-xs font-bold transition border",
                      active
                        ? "bg-lime/10 border-lime/30 text-lime"
                        : "bg-white/[.03] border-white/5 text-zinc-300 hover:bg-white/[.08] hover:text-white",
                    )}
                  >
                    <div
                      className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                        active ? "bg-lime text-ink" : "bg-white/10 text-white",
                      )}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{item.label}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
