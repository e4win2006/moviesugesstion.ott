import { NextResponse } from "next/server";
import { openNativeFolderPicker } from "@/lib/native-folder-picker";
import { scanDirectory } from "@/lib/media-scanner";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const type = body?.type === "music" ? "music" : "movies";
    const title = type === "music" ? "Choose Music & Songs Folder" : "Choose Movies & Videos Folder";

    let selectedPath: string | null = null;
    try {
      selectedPath = await openNativeFolderPicker(title);
    } catch (pickerErr) {
      console.warn("Native folder picker execution error:", pickerErr);
    }

    if (!selectedPath) {
      return NextResponse.json({
        ok: false,
        cancelled: true,
        message: "Folder selection was cancelled or not selected.",
      });
    }

    if (!existsSync(selectedPath)) {
      return NextResponse.json({
        ok: false,
        path: selectedPath,
        exists: false,
        fileCount: 0,
        message: `The selected folder does not exist on disk: "${selectedPath}"`,
      });
    }

    const files = scanDirectory(selectedPath);
    const mediaFiles = files.filter((f) =>
      type === "music" ? f.mediaType === "audio" : f.mediaType === "video"
    );

    return NextResponse.json({
      ok: true,
      path: selectedPath,
      exists: true,
      fileCount: mediaFiles.length,
      totalCount: files.length,
      message: `✓ Folder exists\n✓ ${mediaFiles.length} ${type === "music" ? "song(s)" : "movie file(s)"} found`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error accessing folder dialog";
    return NextResponse.json({
      ok: false,
      error: msg,
      message: msg,
    }, { status: 200 }); // Return 200 with ok: false so frontend receives clean JSON error
  }
}
