CREATE TYPE "MediaType" AS ENUM ('MOVIE', 'TV');
CREATE TYPE "WatchStatus" AS ENUM ('NOT_WATCHED', 'WATCHING', 'WATCHED');
CREATE TYPE "FeedbackType" AS ENUM ('LIKE', 'DISLIKE', 'FAVORITE');
CREATE TYPE "ExclusionType" AS ENUM ('HIDDEN', 'REJECTED');

CREATE TABLE "Profile" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'Edwin',
  "preferredLanguages" TEXT[] DEFAULT ARRAY['en', 'ml']::TEXT[],
  "excludedLanguages" TEXT[] DEFAULT ARRAY['hi']::TEXT[],
  "favoriteGenres" TEXT[],
  "recommendationAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Title" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "imdbId" TEXT,
  "type" "MediaType" NOT NULL,
  "title" TEXT NOT NULL,
  "originalTitle" TEXT,
  "overview" TEXT,
  "year" INTEGER,
  "language" TEXT NOT NULL,
  "posterPath" TEXT,
  "backdropPath" TEXT,
  "trailerUrl" TEXT,
  "runtimeMinutes" INTEGER,
  "numberOfSeasons" INTEGER,
  "completedSeries" BOOLEAN NOT NULL DEFAULT false,
  "imdbRating" DOUBLE PRECISION,
  "rottenTomatoesScore" INTEGER,
  "tmdbRating" DOUBLE PRECISION,
  "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "genres" TEXT[],
  "keywords" TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WatchEntry" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "status" "WatchStatus" NOT NULL DEFAULT 'WATCHED',
  "dateWatched" TIMESTAMP(3),
  "seasonsWatched" INTEGER NOT NULL DEFAULT 0,
  "episodesWatched" INTEGER NOT NULL DEFAULT 0,
  "minutesWatched" INTEGER,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "rating" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WatchEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Feedback" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "type" "FeedbackType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Exclusion" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "type" "ExclusionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Exclusion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Title_tmdbId_type_key" ON "Title"("tmdbId", "type");
CREATE INDEX "Title_type_language_idx" ON "Title"("type", "language");
CREATE INDEX "Title_title_idx" ON "Title"("title");
CREATE UNIQUE INDEX "WatchEntry_profileId_titleId_key" ON "WatchEntry"("profileId", "titleId");
CREATE INDEX "WatchEntry_profileId_status_idx" ON "WatchEntry"("profileId", "status");
CREATE UNIQUE INDEX "Feedback_profileId_titleId_key" ON "Feedback"("profileId", "titleId");
CREATE UNIQUE INDEX "Exclusion_profileId_titleId_key" ON "Exclusion"("profileId", "titleId");

ALTER TABLE "WatchEntry" ADD CONSTRAINT "WatchEntry_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WatchEntry" ADD CONSTRAINT "WatchEntry_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Exclusion" ADD CONSTRAINT "Exclusion_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
