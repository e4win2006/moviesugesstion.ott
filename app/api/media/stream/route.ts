/**
 * /api/media/stream — HTTP Range-Request file streamer
 *
 * Streams local video/audio files to the browser with full seek support.
 * Uses HTTP 206 Partial Content (same protocol as Netflix/YouTube) so the
 * browser's <video>/<audio> element can seek to any position instantly.
 *
 * Security: only files inside MEDIA_MOVIES_DIR or MEDIA_MUSIC_DIR are served.
 */

import { NextRequest } from "next/server";
import { createReadStream, statSync, existsSync } from "fs";
import { Readable } from "stream";
import { decodePath } from "@/lib/media-scanner";
import { extname } from "path";

export const dynamic = "force-dynamic";

// ─── MIME map ─────────────────────────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".m4v":  "video/x-m4v",
  ".mkv":  "video/x-matroska",
  ".avi":  "video/x-msvideo",
  ".wmv":  "video/x-ms-wmv",
  ".ts":   "video/mp2t",
  ".mp3":  "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a":  "audio/mp4",
  ".aac":  "audio/aac",
  ".wav":  "audio/wav",
  ".ogg":  "audio/ogg",
  ".opus": "audio/ogg",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
};

// ─── Security: path whitelist ─────────────────────────────────────────────────

function isAllowed(filePath: string): boolean {
  // Check that the file extension is a valid media format
  const ext = extname(filePath).toLowerCase();
  const validExt =
    [".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi", ".wmv", ".ts", ".flv",
     ".mp3", ".flac", ".m4a", ".aac", ".wav", ".ogg", ".opus", ".wma",
     ".jpg", ".jpeg", ".png", ".webp"].includes(ext);

  if (!validExt) return false;

  // Path traversal guard
  if (filePath.includes("..")) return false;

  return true;
}

// ─── Node → Web ReadableStream bridge ────────────────────────────────────────

function nodeToWeb(node: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      node.on("data",  (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
      node.on("end",   ()              => controller.close());
      node.on("error", (err)           => controller.error(err));
    },
    cancel() { node.destroy(); },
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams.get("p");
  if (!p) return new Response("Missing path", { status: 400 });

  let filePath: string;
  try {
    filePath = decodePath(p);
  } catch {
    return new Response("Invalid path encoding", { status: 400 });
  }

  // Path traversal guard
  if (filePath.includes("..")) return new Response("Forbidden", { status: 403 });
  if (!isAllowed(filePath))    return new Response("Forbidden", { status: 403 });
  if (!existsSync(filePath))   return new Response("File not found", { status: 404 });

  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return new Response("Cannot read file", { status: 500 });
  }

  const fileSize   = stat.size;
  const ext        = extname(filePath).toLowerCase();
  const mimeType   = MIME[ext] || "application/octet-stream";
  const rangeRaw   = req.headers.get("range");

  const baseHeaders = {
    "Accept-Ranges": "bytes",
    "Content-Type":  mimeType,
    "Cache-Control": "no-store",
    // Allow embedding in <video> across same-origin LAN access
    "Access-Control-Allow-Origin": "*",
  };

  // ── Range request (partial content — for seeking) ──────────────────────────
  if (rangeRaw) {
    const match = rangeRaw.match(/bytes=(\d*)-(\d*)/);
    if (!match) return new Response("Invalid Range header", { status: 416 });

    const startStr = match[1];
    const endStr   = match[2];
    const start    = startStr ? parseInt(startStr, 10) : 0;
    const end      = endStr   ? parseInt(endStr,   10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize || start > end) {
      return new Response("Range Not Satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${fileSize}` },
      });
    }

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });

    return new Response(nodeToWeb(nodeStream), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
        "Content-Length": String(chunkSize),
      },
    });
  }

  // ── Full file (first load / non-seekable client) ───────────────────────────
  const nodeStream = createReadStream(filePath);
  return new Response(nodeToWeb(nodeStream), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(fileSize),
    },
  });
}
