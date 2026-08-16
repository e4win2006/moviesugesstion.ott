"use client";

/**
 * TMDB Setup Banner
 * Shows when the app is running without a TMDB API key,
 * guiding the user to get their free key and enable live content.
 */

import { useState } from "react";
import { X, Zap, ExternalLink } from "lucide-react";

export function TmdbSetupBanner({ hasTmdb }: { hasTmdb: boolean }) {
  const [dismissed, setDismissed] = useState(false);

  if (hasTmdb || dismissed) return null;

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-4 sm:flex-row sm:items-start sm:gap-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-400">
        <Zap size={18} />
      </span>
      <div className="flex-1">
        <p className="text-xs font-black text-amber-300">
          Enable Live Search &amp; Unlimited Content
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          This app is running with static demo content. Add a free TMDB API key
          to unlock live Hollywood movies, British shows, Malayalam films, and
          real-time search across millions of titles.
        </p>
        <ol className="mt-2 list-inside list-decimal space-y-0.5 text-[11px] text-zinc-500">
          <li>
            Go to{" "}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-amber-400 underline hover:text-amber-300"
            >
              themoviedb.org/settings/api
              <ExternalLink size={10} />
            </a>{" "}
            (free account)
          </li>
          <li>
            Copy your <strong className="text-zinc-300">API Read Access Token</strong>
          </li>
          <li>
            Open{" "}
            <code className="rounded bg-white/5 px-1 text-zinc-300">.env</code>{" "}
            and set{" "}
            <code className="rounded bg-white/5 px-1 text-lime">
              TMDB_API_KEY=&quot;your_key&quot;
            </code>
          </li>
          <li>Restart the dev server — live content loads instantly</li>
        </ol>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="grid h-7 w-7 shrink-0 place-items-center self-start rounded-lg text-zinc-600 hover:bg-white/5 hover:text-zinc-400"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
