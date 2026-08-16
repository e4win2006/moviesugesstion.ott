import { NextResponse } from "next/server";
import { scanDirectory, enrichFilesWithMetadata } from "@/lib/media-scanner";
import { getMediaFolderSettings } from "@/lib/media-db";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "movies";
  const customDir = searchParams.get("dir");

  const { moviesDir, musicDir } = await getMediaFolderSettings();

  const targetDir = customDir
    ? customDir.trim().replace(/\\/g, "/")
    : type === "music"
      ? musicDir
      : moviesDir;

  if (!targetDir) {
    const envKey =
      type === "music" ? "MEDIA_MUSIC_DIR" : "MEDIA_MOVIES_DIR";
    return NextResponse.json({
      files: [],
      configured: false,
      dir: null,
      message: `No folder configured. Set ${envKey} or select a folder in the UI.`,
    });
  }

  if (!existsSync(targetDir)) {
    return NextResponse.json({
      files: [],
      configured: false,
      dir: targetDir,
      exists: false,
      message: `Folder does not exist on disk: ${targetDir}`,
    });
  }

  const rawFiles = scanDirectory(targetDir);
  const files = await enrichFilesWithMetadata(rawFiles);

  return NextResponse.json({
    files,
    configured: true,
    dir: targetDir,
    exists: true,
    count: files.length,
  });
}
