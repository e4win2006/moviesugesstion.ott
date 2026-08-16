import { NextResponse } from "next/server";
import { scanDirectory, enrichFilesWithMetadata } from "@/lib/media-scanner";
import { getMediaFolderSettings, getUploadDir } from "@/lib/media-db";
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

  let rawFiles = scanDirectory(targetDir);

  // If upload directory is separate from targetDir, merge files from uploads directory as well
  const uploadDir = getUploadDir(type === "music" ? "music" : "movies");
  if (uploadDir && uploadDir.toLowerCase() !== targetDir.toLowerCase() && existsSync(uploadDir)) {
    const uploadFiles = scanDirectory(uploadDir);
    const existingPaths = new Set(rawFiles.map((f) => f.id));
    for (const uf of uploadFiles) {
      if (!existingPaths.has(uf.id)) {
        rawFiles.push(uf);
      }
    }
  }

  const files = await enrichFilesWithMetadata(rawFiles);

  return NextResponse.json({
    files,
    configured: true,
    dir: targetDir,
    exists: true,
    count: files.length,
  });
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const p = searchParams.get("id") || searchParams.get("p");
    if (!p) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
    }

    const { decodePath } = await import("@/lib/media-scanner");
    const { unlinkSync, existsSync } = await import("fs");
    const filePath = decodePath(p);

    if (filePath.includes("..")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existsSync(filePath)) {
      unlinkSync(filePath);
      return NextResponse.json({ success: true, message: "File deleted successfully" });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to delete file" }, { status: 500 });
  }
}
