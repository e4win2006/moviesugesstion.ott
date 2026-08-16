import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { scanDirectory } from "@/lib/media-scanner";
import { getMediaFolderSettings, saveMediaFolderSetting } from "@/lib/media-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const { moviesDir, musicDir } = await getMediaFolderSettings();

  // Common user directory paths on Windows
  const userHome = process.env.USERPROFILE || process.env.HOME || "C:/Users";
  const commonSuggestions = {
    movies: [
      join(userHome, "Videos").replace(/\\/g, "/"),
      join(userHome, "Downloads").replace(/\\/g, "/"),
      "D:/Movies",
      "D:/Videos",
      "E:/Movies",
    ],
    music: [
      join(userHome, "Music").replace(/\\/g, "/"),
      join(userHome, "Downloads").replace(/\\/g, "/"),
      "D:/Music",
      "D:/Songs",
      "E:/Music",
    ],
  };

  return NextResponse.json({
    movies: {
      configured: !!moviesDir,
      exists: moviesDir ? existsSync(moviesDir) : false,
      path: moviesDir || null,
      fileCount: moviesDir && existsSync(moviesDir) ? scanDirectory(moviesDir).length : 0,
    },
    music: {
      configured: !!musicDir,
      exists: musicDir ? existsSync(musicDir) : false,
      path: musicDir || null,
      fileCount: musicDir && existsSync(musicDir) ? scanDirectory(musicDir).length : 0,
    },
    suggestions: commonSuggestions,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, path } = body as { type: "movies" | "music"; path: string };

    if (!type || !path) {
      return NextResponse.json({ error: "Type and path are required" }, { status: 400 });
    }

    const cleanPath = path.trim().replace(/\\/g, "/");

    if (!existsSync(cleanPath)) {
      return NextResponse.json({
        error: `Folder not found: "${cleanPath}". Please check if the directory exists on your computer.`,
        exists: false,
      }, { status: 404 });
    }

    // Persist permanently in DB & file database
    await saveMediaFolderSetting(type, cleanPath);

    const scanned = scanDirectory(cleanPath);

    return NextResponse.json({
      ok: true,
      type,
      path: cleanPath,
      exists: true,
      fileCount: scanned.length,
      message: `Folder updated and remembered in database! Found ${scanned.length} media file(s).`,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
