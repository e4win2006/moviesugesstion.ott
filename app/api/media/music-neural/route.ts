import { NextResponse } from "next/server";
import { scanDirectory, enrichFilesWithMetadata } from "@/lib/media-scanner";
import { getMediaFolderSettings } from "@/lib/media-db";
import {
  extractAudioFeatures,
  getNeuralSimilarTracks,
  generateNeuralRadioQueue,
} from "@/lib/music-neural-engine";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("id");
    const mode = searchParams.get("mode") || "similar"; // 'similar' | 'radio' | 'features'

    const { musicDir } = await getMediaFolderSettings();

    if (!musicDir || !existsSync(musicDir)) {
      return NextResponse.json({ error: "Music directory not configured" }, { status: 404 });
    }

    const rawFiles = scanDirectory(musicDir);
    const audioFiles = rawFiles.filter((f) => f.mediaType === "audio");
    const allSongs = await enrichFilesWithMetadata(audioFiles);

    if (allSongs.length === 0) {
      return NextResponse.json({ error: "No songs found in library" }, { status: 404 });
    }

    const seedTrack = allSongs.find((s) => s.id === fileId) || allSongs[0];
    const seedFeatures = extractAudioFeatures(seedTrack);

    if (mode === "features") {
      return NextResponse.json({
        track: seedTrack,
        features: seedFeatures,
      });
    }

    if (mode === "radio") {
      const radioQueue = generateNeuralRadioQueue(seedTrack, allSongs);
      return NextResponse.json({
        seed: seedTrack,
        features: seedFeatures,
        queue: radioQueue,
        count: radioQueue.length,
      });
    }

    // Default: 'similar'
    const matches = getNeuralSimilarTracks(seedTrack, allSongs, 10);

    return NextResponse.json({
      seed: seedTrack,
      features: seedFeatures,
      matches,
      totalAnalyzed: allSongs.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
