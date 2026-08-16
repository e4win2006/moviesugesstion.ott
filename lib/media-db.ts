import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/prisma";

export interface MediaFolderSettings {
  moviesDir: string;
  musicDir: string;
  updatedAt?: string;
}

const DATA_DIR = join(process.cwd(), "data");
const SETTINGS_FILE = join(DATA_DIR, "media-settings.json");

/**
 * Read persistent media folder settings from Database -> Local file DB -> Environment -> Defaults
 */
export async function getMediaFolderSettings(): Promise<MediaFolderSettings> {
  let moviesDir = process.env.MEDIA_MOVIES_DIR || "";
  let musicDir = process.env.MEDIA_MUSIC_DIR || "";

  // 1. Try reading from persistent local JSON database
  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed.moviesDir && existsSync(parsed.moviesDir)) {
        moviesDir = parsed.moviesDir;
      }
      if (parsed.musicDir && existsSync(parsed.musicDir)) {
        musicDir = parsed.musicDir;
      }
    }
  } catch (err) {
    console.warn("Could not read media-settings.json:", err);
  }

  // 2. Try querying Prisma / PostgreSQL if available
  try {
    // Attempt to read from DB if settings table exists
    const movieSetting = await (prisma as any).setting?.findUnique?.({
      where: { key: "MEDIA_MOVIES_DIR" },
    });
    if (movieSetting?.value && existsSync(movieSetting.value)) {
      moviesDir = movieSetting.value;
    }

    const musicSetting = await (prisma as any).setting?.findUnique?.({
      where: { key: "MEDIA_MUSIC_DIR" },
    });
    if (musicSetting?.value && existsSync(musicSetting.value)) {
      musicDir = musicSetting.value;
    }
  } catch {
    // Prisma table may not exist yet, fallback gracefully
  }

  // Fallback defaults if still empty
  if (!moviesDir) {
    const userHome = process.env.USERPROFILE || process.env.HOME || "C:/Users";
    const defaultVideos = join(userHome, "Videos").replace(/\\/g, "/");
    if (existsSync(defaultVideos)) moviesDir = defaultVideos;
  }

  if (!musicDir) {
    const userHome = process.env.USERPROFILE || process.env.HOME || "C:/Users";
    const defaultMusic = join(userHome, "Music").replace(/\\/g, "/");
    if (existsSync(defaultMusic)) musicDir = defaultMusic;
  }

  // Sync to runtime process.env
  if (moviesDir) process.env.MEDIA_MOVIES_DIR = moviesDir;
  if (musicDir) process.env.MEDIA_MUSIC_DIR = musicDir;

  return {
    moviesDir,
    musicDir,
  };
}

/**
 * Save and remember folder locations in Database + File Database + .env + Runtime
 */
export async function saveMediaFolderSetting(
  type: "movies" | "music",
  folderPath: string
): Promise<boolean> {
  const cleanPath = folderPath.trim().replace(/\\/g, "/");
  const envKey = type === "movies" ? "MEDIA_MOVIES_DIR" : "MEDIA_MUSIC_DIR";

  // 1. Update runtime environment
  process.env[envKey] = cleanPath;

  // 2. Persist to data/media-settings.json file database
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    let currentSettings: MediaFolderSettings = {
      moviesDir: process.env.MEDIA_MOVIES_DIR || "",
      musicDir: process.env.MEDIA_MUSIC_DIR || "",
    };

    if (existsSync(SETTINGS_FILE)) {
      try {
        currentSettings = JSON.parse(readFileSync(SETTINGS_FILE, "utf8"));
      } catch {}
    }

    if (type === "movies") {
      currentSettings.moviesDir = cleanPath;
    } else {
      currentSettings.musicDir = cleanPath;
    }
    currentSettings.updatedAt = new Date().toISOString();

    writeFileSync(SETTINGS_FILE, JSON.stringify(currentSettings, null, 2), "utf8");
  } catch (err) {
    console.warn("Could not persist to media-settings.json:", err);
  }

  // 3. Try persisting to PostgreSQL DB if Prisma is connected
  try {
    await (prisma as any).setting?.upsert?.({
      where: { key: envKey },
      update: { value: cleanPath },
      create: { key: envKey, value: cleanPath },
    });
  } catch {
    // Graceful fallback if database table not yet migrated
  }

  // 4. Persist to .env file
  const envFilePath = join(process.cwd(), ".env");
  if (existsSync(envFilePath)) {
    try {
      let envContent = readFileSync(envFilePath, "utf8");
      const regex = new RegExp(`^${envKey}=.*$`, "m");
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${envKey}="${cleanPath}"`);
      } else {
        envContent += `\n${envKey}="${cleanPath}"`;
      }
      writeFileSync(envFilePath, envContent, "utf8");
    } catch (err) {
      console.warn("Could not write to .env file:", err);
    }
  }

  return true;
}
