/**
 * Client-safe media types and formatting utilities.
 * (No Node.js 'fs' or 'path' imports here so this can be imported in React client components).
 */

export interface MediaMetadata {
  cleanTitle?: string;
  year?: number | null;
  overview?: string | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  rating?: number | null;
  genres?: string[];
  imdbId?: string | null;
  imdbUrl?: string | null;
  artist?: string | null;
  album?: string | null;
  actors?: string | null;
}

export interface MediaFile {
  id: string;            // base64url-encoded absolute path (used as stream key)
  name: string;          // display name (without extension)
  filename: string;      // full filename including extension
  relativePath: string;  // path relative to the root scan dir
  ext: string;           // lowercase extension including dot
  mediaType: "video" | "audio";
  sizeBytes: number;
  sizeFormatted: string;
  modifiedAt: string;    // ISO date string
  mimeType: string;
  nativelyPlayable: boolean; // can browser play without transcoding?
  customBlobUrl?: string;    // for direct in-browser picked files
  metadata?: MediaMetadata;  // parsed / fetched movie metadata
}

export function formatBytes(bytes: number): string {
  if (bytes < 1_024)         return `${bytes} B`;
  if (bytes < 1_048_576)     return `${(bytes / 1_024).toFixed(1)} KB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}
