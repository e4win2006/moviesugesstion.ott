"use client";

import { FormEvent, useState } from "react";
import Papa from "papaparse";
import { CheckCircle2, FileUp, Plus } from "lucide-react";

export function ImportTools() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async ({ data }) => {
        const rows = data.map((row) => ({
          title: row.Title || row.title || row.Name || row.name,
          type: row["Title Type"] || row.type,
          year: row.Year || row.year,
          imdbId: row.Const || row.imdb_id || row.imdbId,
          rating: row["Your Rating"] || row.rating,
          dateWatched: row.Date || row.date_watched,
        })).filter((row) => row.title);
        const response = await fetch("/api/import", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rows }),
        });
        const result = await response.json();
        setBusy(false);
        setMessage(response.ok ? `${result.imported} titles imported; ${result.enriched} matched with genre metadata.` : "Import failed. Check the file columns.");
      },
    });
  }

  async function manual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/titles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"), type: form.get("type"), year: form.get("year") || undefined,
        language: form.get("language"), watched: true, source: "manual",
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? result.message : result.error || "Couldn’t add that title.");
    if (response.ok) event.currentTarget.reset();
  }

  return (
    <div className="mt-8 grid gap-5 lg:grid-cols-2">
      <section className="glass rounded-3xl p-6 sm:p-8">
        <FileUp className="text-lime" />
        <h2 className="mt-5 text-xl font-black">IMDb or CSV export</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">Supports IMDb watchlist/rating exports and standard CSV files with title, year, type, rating, or watched-date columns.</p>
        <label className="mt-7 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 text-center transition hover:border-lime/50">
          <FileUp className="mb-3 text-zinc-500" />
          <span className="text-sm font-bold">{busy ? "Importing…" : "Choose a .csv file"}</span>
          <span className="mt-1 text-xs text-zinc-600">Up to 5,000 rows per import</span>
          <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={(event) => upload(event.target.files?.[0])} />
        </label>
      </section>
      <section className="glass rounded-3xl p-6 sm:p-8">
        <Plus className="text-lime" />
        <h2 className="mt-5 text-xl font-black">Add a watched title</h2>
        <p className="mt-2 text-sm text-zinc-400">Enter a name and we’ll match it, retrieve IMDb-linked metadata and genres, then add it to this profile.</p>
        <form onSubmit={manual} className="mt-7 grid gap-3">
          <input required name="title" placeholder="Title" className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none focus:border-lime/50" />
          <div className="grid grid-cols-2 gap-3">
            <select name="type" className="h-12 rounded-xl border border-white/10 bg-[#11141a] px-4 text-sm"><option value="MOVIE">Movie</option><option value="TV">TV series</option></select>
            <input name="year" type="number" min="1900" max="2100" placeholder="Year" className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-sm outline-none" />
          </div>
          <select name="language" className="h-12 rounded-xl border border-white/10 bg-[#11141a] px-4 text-sm"><option value="en">English</option><option value="ml">Malayalam</option><option value="other">Other</option></select>
          <button disabled={busy} className="mt-2 rounded-xl bg-lime py-3.5 text-sm font-black text-ink">Add to watched</button>
        </form>
      </section>
      {message && <div className="lg:col-span-2 flex items-center gap-2 rounded-xl border border-lime/20 bg-lime/[.07] px-4 py-3 text-sm text-lime"><CheckCircle2 size={16} /> {message}</div>}
    </div>
  );
}
