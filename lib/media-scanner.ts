/**
 * media-scanner.ts — recursive local filesystem scanner
 * Scans a directory for video/audio files and returns structured metadata.
 * Used by /api/media/files to power the local library browser.
 */

import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { parseMediaFilename, fetchMediaMetadata } from "@/lib/media-metadata";

// ─── Supported formats ────────────────────────────────────────────────────────

export const VIDEO_EXTS = new Set([
  ".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi", ".flv", ".wmv", ".ts",
]);

export const AUDIO_EXTS = new Set([
  ".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".wma", ".alac",
]);

// Formats that play natively in modern browsers without transcoding
const NATIVE_VIDEO = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const NATIVE_AUDIO = new Set([".mp3", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".flac"]);

const MIME_MAP: Record<string, string> = {
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".m4v":  "video/x-m4v",
  ".mkv":  "video/x-matroska",
  ".avi":  "video/x-msvideo",
  ".flv":  "video/x-flv",
  ".wmv":  "video/x-ms-wmv",
  ".ts":   "video/mp2t",
  ".mp3":  "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a":  "audio/mp4",
  ".aac":  "audio/aac",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
  ".opus": "audio/ogg",
  ".wma":  "audio/x-ms-wma",
};

import { MediaFile, formatBytes } from "@/lib/media-types";
export type { MediaFile };
export { formatBytes };

// ─── Path encoding/decoding (base64url, URL-safe) ─────────────────────────────

export function encodePath(p: string): string {
  return Buffer.from(p, "utf8").toString("base64url");
}

export function decodePath(encoded: string): string {
  return Buffer.from(encoded, "base64url").toString("utf8");
}

// ─── Directory scanner ────────────────────────────────────────────────────────

/**
 * Recursively scan `rootDir` up to `maxDepth` levels deep.
 * Returns all video and audio files found, sorted by name.
 */
export function scanDirectory(rootDir: string, maxDepth = 4): MediaFile[] {
  if (!rootDir || !existsSync(rootDir)) return [];

  const results: MediaFile[] = [];

  function walk(dir: string, depth: number) {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return; // permission denied or empty — skip silently
    }

    for (const entry of entries) {
      // Skip hidden files and system directories
      if (entry.startsWith(".") || entry === "System Volume Information") continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }

      const ext = extname(entry).toLowerCase();
      let mediaType: "video" | "audio" | null = null;
      if (VIDEO_EXTS.has(ext))      mediaType = "video";
      else if (AUDIO_EXTS.has(ext)) mediaType = "audio";
      if (!mediaType) continue;

      const filename = basename(entry);
      const { cleanTitle, year } = parseMediaFilename(filename);
      const name = cleanTitle || filename.slice(0, filename.length - ext.length);
      const baseNameNoExt = filename.slice(0, filename.length - ext.length);

      // Check for companion image in same directory (e.g. Inception.jpg, poster.jpg, cover.jpg)
      const imageCandidates = [
        join(dir, `${baseNameNoExt}.jpg`),
        join(dir, `${baseNameNoExt}.jpeg`),
        join(dir, `${baseNameNoExt}.png`),
        join(dir, `${baseNameNoExt}.webp`),
        join(dir, "poster.jpg"),
        join(dir, "cover.jpg"),
        join(dir, "folder.jpg"),
      ];

      let localPosterUrl: string | null = null;
      for (const imgPath of imageCandidates) {
        if (existsSync(imgPath)) {
          localPosterUrl = `/api/media/stream?p=${encodePath(imgPath)}`;
          break;
        }
      }

      // Relative path from root (for display)
      const relativePath = fullPath.replace(rootDir, "").replace(/^[/\\]/, "");

      results.push({
        id: encodePath(fullPath),
        name,
        filename,
        relativePath,
        ext,
        mediaType,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        modifiedAt: stat.mtime.toISOString(),
        mimeType: MIME_MAP[ext] || "application/octet-stream",
        nativelyPlayable:
          mediaType === "video" ? NATIVE_VIDEO.has(ext) : NATIVE_AUDIO.has(ext),
        metadata: {
          cleanTitle: name,
          year,
          posterUrl: localPosterUrl,
        },
      });
    }
  }

  walk(rootDir, 0);

  // Sort alphabetically by display name
  return results.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Fetch and attach full posters, overview, rating metadata for a list of files
 */
export async function enrichFilesWithMetadata(files: MediaFile[]): Promise<MediaFile[]> {
  const promises = files.map(async (f) => {
    try {
      const meta = await fetchMediaMetadata(f.filename, f.mediaType);
      return {
        ...f,
        name: meta.cleanTitle || f.name,
        metadata: {
          ...meta,
          posterUrl: meta.posterUrl || f.metadata?.posterUrl || null,
        },
      };
    } catch {
      return f;
    }
  });

  return Promise.all(promises);
}
