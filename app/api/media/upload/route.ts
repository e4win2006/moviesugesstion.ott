import { NextResponse } from "next/server";
import { join, extname, basename } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { getUploadDir, getMediaFolderSettings } from "@/lib/media-db";
import {
  scanDirectory,
  enrichFilesWithMetadata,
  encodePath,
  VIDEO_EXTS,
  AUDIO_EXTS,
  formatBytes,
} from "@/lib/media-scanner";
import type { MediaFile } from "@/lib/media-types";

export const dynamic = "force-dynamic";

// Next.js body size limit config if needed
export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
  ".ts": "video/mp2t",
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wma": "audio/x-ms-wma",
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const type = (formData.get("type") as string) === "movies" ? "movies" : "music";
    const customDir = formData.get("dir") as string | null;

    let targetDir = customDir;
    if (!targetDir) {
      targetDir = getUploadDir(type);
    }

    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Collect all uploaded files from form
    const uploadedFiles: File[] = [];
    const filesField = formData.getAll("files");
    if (filesField && filesField.length > 0) {
      for (const item of filesField) {
        if (item instanceof File) uploadedFiles.push(item);
      }
    }

    const singleFile = formData.get("file");
    if (singleFile instanceof File && !uploadedFiles.includes(singleFile)) {
      uploadedFiles.push(singleFile);
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "No files found in upload request." },
        { status: 400 }
      );
    }

    const savedMediaFiles: MediaFile[] = [];

    for (const file of uploadedFiles) {
      const originalName = file.name;
      const ext = extname(originalName).toLowerCase();

      // Only allow audio and video extensions
      const isAudio = AUDIO_EXTS.has(ext);
      const isVideo = VIDEO_EXTS.has(ext);

      if (!isAudio && !isVideo) {
        continue;
      }

      // Clean file name to prevent traversal while keeping recognizable title
      const safeBase = originalName
        .replace(/[/\\?%*:|"<>]/g, "_")
        .trim();

      const filePath = join(targetDir, safeBase).replace(/\\/g, "/");

      // Read buffer and save to server storage
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      writeFileSync(filePath, buffer);

      const mediaType = isAudio ? "audio" : "video";
      const sizeBytes = buffer.length;

      const mediaFileObj: MediaFile = {
        id: encodePath(filePath),
        name: safeBase.slice(0, safeBase.length - ext.length),
        filename: safeBase,
        relativePath: safeBase,
        ext,
        mediaType,
        sizeBytes,
        sizeFormatted: formatBytes(sizeBytes),
        modifiedAt: new Date().toISOString(),
        mimeType: MIME_MAP[ext] || (isAudio ? "audio/mpeg" : "video/mp4"),
        nativelyPlayable: true,
        metadata: {
          cleanTitle: safeBase.slice(0, safeBase.length - ext.length),
        },
      };

      savedMediaFiles.push(mediaFileObj);
    }

    // Enrich saved files with online metadata / posters
    const enriched = await enrichFilesWithMetadata(savedMediaFiles);

    return NextResponse.json({
      success: true,
      files: enriched,
      count: enriched.length,
      storageDir: targetDir,
      message: `Successfully uploaded and stored ${enriched.length} song(s) in persistent library!`,
    });
  } catch (err: any) {
    console.error("Error during media upload:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process file upload" },
      { status: 500 }
    );
  }
}
