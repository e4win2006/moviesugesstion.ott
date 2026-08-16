import { PrismaClient, MediaType, WatchStatus, FeedbackType } from "@prisma/client";
import { PREFERRED_GENRES } from "../lib/constants";

const prisma = new PrismaClient();

const watched = [
  { tmdbId: 57243, title: "Designated Survivor", year: 2016, genres: ["Political Thriller", "Government Conspiracy"], keywords: ["Intelligence Agencies"], rating: 7.5 },
  { tmdbId: 1411, title: "Person of Interest", year: 2011, genres: ["Crime Thriller", "Artificial Intelligence"], keywords: ["Surveillance", "Government Conspiracy"], rating: 8.5 },
  { tmdbId: 113962, title: "Paradise", year: 2025, genres: ["Mystery", "Political Thriller"], keywords: ["Government Conspiracy"], rating: 7.9 },
  { tmdbId: 211288, title: "Tracker", year: 2024, genres: ["Crime Thriller", "Detective"], keywords: ["Survival"], rating: 7.0 },
  { tmdbId: 62560, title: "Mr. Robot", year: 2015, genres: ["Cybersecurity", "Hacking", "Psychological Thriller"], keywords: ["Tech Drama"], rating: 8.5 },
  { tmdbId: 60797, title: "Scorpion", year: 2014, genres: ["Tech Drama", "Action"], keywords: ["Hacking"], rating: 7.0 },
  { tmdbId: 61811, title: "CSI: Cyber", year: 2015, genres: ["Cybersecurity", "Crime Thriller"], keywords: ["Detective"], rating: 5.5 },
  { tmdbId: 233629, title: "Bodies", year: 2023, genres: ["Mystery", "Detective", "Sci-Fi"], keywords: ["Crime Thriller"], rating: 7.3 },
  { tmdbId: 205715, title: "Gen V", year: 2023, genres: ["Action", "Mystery"], keywords: ["Psychological Thriller"], rating: 7.7 },
  { tmdbId: 76479, title: "The Boys", year: 2019, genres: ["Action", "Crime Thriller"], keywords: ["Psychological Thriller"], rating: 8.6 },
];

const recommendations: Array<{
  tmdbId: number;
  imdbId?: string;
  type?: MediaType;
  title: string;
  year: number;
  genres: string[];
  keywords: string[];
  imdb: number;
  rt: number;
  popularity: number;
  poster: string;
  completed: boolean;
}> = [
  // Movies
  { tmdbId: 693134, imdbId: "tt15239678", type: MediaType.MOVIE, title: "Dune: Part Two", year: 2024, genres: ["Sci-Fi", "Action", "Adventure"], keywords: ["Space Exploration", "Dystopian Future"], imdb: 8.5, rt: 92, popularity: 350, poster: "/1pdfLPoWuVzhAcStmC2jKMToNJg.jpg", completed: false },
  { tmdbId: 872585, imdbId: "tt15398776", type: MediaType.MOVIE, title: "Oppenheimer", year: 2023, genres: ["Drama", "History", "Political Thriller"], keywords: ["Government Conspiracy"], imdb: 8.9, rt: 93, popularity: 310, poster: "/8Gxv8gSFCU0XGDykEGvCiqA1Wl.jpg", completed: false },
  { tmdbId: 945961, imdbId: "tt18412256", type: MediaType.MOVIE, title: "Alien: Romulus", year: 2024, genres: ["Sci-Fi", "Horror", "Action"], keywords: ["Space Exploration", "Survival"], imdb: 7.3, rt: 80, popularity: 290, poster: "/b33nnKl1bdhCOAAY2hYSuioAYR5.jpg", completed: false },
  { tmdbId: 929590, imdbId: "tt17279496", type: MediaType.MOVIE, title: "Civil War", year: 2024, genres: ["Action", "Political Thriller", "Dystopian Future"], keywords: ["Government Conspiracy"], imdb: 7.1, rt: 81, popularity: 240, poster: "/sh7Rg8Er3tFcN9VJzNvjG2A25hP.jpg", completed: false },
  { tmdbId: 533535, imdbId: "tt6263850", type: MediaType.MOVIE, title: "Deadpool & Wolverine", year: 2024, genres: ["Action", "Comedy", "Marvel"], keywords: ["Sci-Fi"], imdb: 7.7, rt: 78, popularity: 400, poster: "/8cdWjvZKV2bKjE9Z2GZUzZJvVI.jpg", completed: false },
  { tmdbId: 1022789, imdbId: "tt22022452", type: MediaType.MOVIE, title: "Inside Out 2", year: 2024, genres: ["Animation", "Comedy", "Drama"], keywords: ["Psychological Thriller"], imdb: 7.6, rt: 91, popularity: 330, poster: "/vpnVM9B6NMmQpEZaE1f4t4uYmP.jpg", completed: false },
  { tmdbId: 746036, imdbId: "tt1684562", type: MediaType.MOVIE, title: "The Fall Guy", year: 2024, genres: ["Action", "Comedy", "Crime Thriller"], keywords: ["Detective"], imdb: 6.9, rt: 82, popularity: 210, poster: "/e112FlbA6e4Wz89255j6c039yP.jpg", completed: false },
  { tmdbId: 558449, imdbId: "tt9263550", type: MediaType.MOVIE, title: "Gladiator II", year: 2024, genres: ["Action", "Drama", "History"], keywords: ["Political Thriller"], imdb: 6.8, rt: 76, popularity: 280, poster: "/2cxhvwyEwRlysAmRHrchAvo05hp.jpg", completed: false },
  { tmdbId: 823464, imdbId: "tt14539740", type: MediaType.MOVIE, title: "Godzilla x Kong: The New Empire", year: 2024, genres: ["Action", "Sci-Fi"], keywords: ["Survival"], imdb: 6.1, rt: 54, popularity: 220, poster: "/z1y5ebWpgr8VUdEENlyMw0WiyXD.jpg", completed: false },
  { tmdbId: 1032823, imdbId: "tt26753003", type: MediaType.MOVIE, title: "Trap", year: 2024, genres: ["Crime Thriller", "Mystery", "Psychological Thriller"], keywords: ["Detective"], imdb: 6.2, rt: 57, popularity: 190, poster: "/2XW4wP15b1rW13C7B38A2g521F.jpg", completed: false },

  // TV Shows
  { tmdbId: 126308, imdbId: "tt2788316", type: MediaType.TV, title: "Shogun", year: 2024, genres: ["Drama", "History", "Political Thriller"], keywords: ["Intelligence Agencies"], imdb: 8.7, rt: 99, popularity: 340, poster: "/7O4iVf26YScHaPDLhPj1P22wW6s.jpg", completed: false },
  { tmdbId: 106379, imdbId: "tt12637874", type: MediaType.TV, title: "Fallout", year: 2024, genres: ["Sci-Fi", "Action", "Dystopian Future"], keywords: ["Survival"], imdb: 8.4, rt: 94, popularity: 360, poster: "/2T8V03hH8gY1gJ5c39gY2Ww1h8.jpg", completed: false },
  { tmdbId: 137437, imdbId: "tt15474916", type: MediaType.TV, title: "The Penguin", year: 2024, genres: ["Crime Thriller", "Drama", "DC"], keywords: ["Government Conspiracy"], imdb: 8.8, rt: 95, popularity: 380, poster: "/7x09d2k4H78A4b3C59P1G1f6J.jpg", completed: false },
  { tmdbId: 94605, imdbId: "tt11126994", type: MediaType.TV, title: "Arcane", year: 2024, genres: ["Animation", "Sci-Fi", "Action"], keywords: ["Dystopian Future"], imdb: 9.0, rt: 100, popularity: 390, poster: "/fqld2gZUtUtmRjTzC2oD5z81L.jpg", completed: false },
  { tmdbId: 95396, imdbId: "tt11280740", type: MediaType.TV, title: "Severance", year: 2022, genres: ["Tech Drama", "Mystery", "Sci-Fi"], keywords: ["Psychological Thriller", "Government Conspiracy"], imdb: 8.7, rt: 96, popularity: 320, poster: "/pPHpeI2X1qEd1CS1SeyrdhZ4qnT.jpg", completed: false },
  { tmdbId: 81349, imdbId: "tt8134186", type: MediaType.TV, title: "Devs", year: 2020, genres: ["Artificial Intelligence", "Tech Drama", "Sci-Fi"], keywords: ["Psychological Thriller", "Government Conspiracy"], imdb: 7.6, rt: 82, popularity: 42, poster: "/6vD0yB1HAtB5qvVoR6PC8FbRV8.jpg", completed: true },
  { tmdbId: 42009, imdbId: "tt2085059", type: MediaType.TV, title: "Black Mirror", year: 2011, genres: ["Sci-Fi", "Tech Drama", "Dystopian Future"], keywords: ["Artificial Intelligence", "Psychological Thriller"], imdb: 8.7, rt: 84, popularity: 210, poster: "/7PRddO7z7mcPi21nZTCMGShAyy1.jpg", completed: false },
  { tmdbId: 63247, imdbId: "tt0475784", type: MediaType.TV, title: "Westworld", year: 2016, genres: ["Artificial Intelligence", "Sci-Fi", "Dystopian Future"], keywords: ["Mystery", "Psychological Thriller"], imdb: 8.5, rt: 80, popularity: 155, poster: "/8MfgyFHf7XEboZJPZXCIDqqiz6e.jpg", completed: true },
  { tmdbId: 95480, imdbId: "tt5875444", type: MediaType.TV, title: "Slow Horses", year: 2022, genres: ["Intelligence Agencies", "Crime Thriller"], keywords: ["Government Conspiracy", "Mystery"], imdb: 8.3, rt: 98, popularity: 175, poster: "/b5cVZMP5WxpRUUc0BqIP7J6dGqA.jpg", completed: false },
  { tmdbId: 110356, imdbId: "tt13918776", type: MediaType.TV, title: "The Night Agent", year: 2023, genres: ["Government Conspiracy", "Action", "Political Thriller"], keywords: ["Intelligence Agencies"], imdb: 7.5, rt: 81, popularity: 290, poster: "/4c5yUNcaff4W4aPrkXE6zr7papX.jpg", completed: false },
  { tmdbId: 63646, imdbId: "tt4643084", type: MediaType.TV, title: "Counterpart", year: 2017, genres: ["Sci-Fi", "Intelligence Agencies", "Mystery"], keywords: ["Government Conspiracy"], imdb: 8.0, rt: 100, popularity: 36, poster: "/eTTmSxo2GrlN81nR0Kr6M5vwVFP.jpg", completed: true },
  { tmdbId: 46511, type: MediaType.TV, title: "Utopia", year: 2013, genres: ["Government Conspiracy", "Mystery", "Psychological Thriller"], keywords: ["Dystopian Future"], imdb: 8.4, rt: 100, popularity: 38, poster: "/7v9cV4XVyB8O2jT3hC4cF73q0mA.jpg", completed: true },
  { tmdbId: 108545, type: MediaType.TV, title: "3 Body Problem", year: 2024, genres: ["Sci-Fi", "Mystery", "Space Exploration"], keywords: ["Government Conspiracy"], imdb: 7.5, rt: 79, popularity: 245, poster: "/sphnjjiYb50SbWMToWZ0fC1DArZ.jpg", completed: false },
  { tmdbId: 125988, type: MediaType.TV, title: "Silo", year: 2023, genres: ["Dystopian Future", "Mystery", "Sci-Fi"], keywords: ["Government Conspiracy", "Survival"], imdb: 8.1, rt: 92, popularity: 260, poster: "/tlliQuCupf8fpTH7RAor3aKMGy.jpg", completed: false },
  { tmdbId: 83867, type: MediaType.TV, title: "Andor", year: 2022, genres: ["Sci-Fi", "Political Thriller", "Action"], keywords: ["Intelligence Agencies", "Space Exploration"], imdb: 8.4, rt: 96, popularity: 195, poster: "/59SVNwLfoMnZPPB6ukW6dlPxAdI.jpg", completed: false },
  { tmdbId: 70523, imdbId: "tt5753856", type: MediaType.TV, title: "Dark", year: 2017, genres: ["Mystery", "Sci-Fi", "Psychological Thriller"], keywords: ["Government Conspiracy"], imdb: 8.7, rt: 95, popularity: 185, poster: "/apbrbWs8M9lyOpJYU5WXrpFbk1Z.jpg", completed: true },
  { tmdbId: 67744, imdbId: "tt5290382", type: MediaType.TV, title: "Mindhunter", year: 2017, genres: ["Crime Thriller", "Detective", "Psychological Thriller"], keywords: ["Mystery"], imdb: 8.6, rt: 97, popularity: 135, poster: "/fbKE87mojpIETWepSbD5Qt741fp.jpg", completed: true },
  { tmdbId: 89233, imdbId: "tt8201186", type: MediaType.TV, title: "The Capture", year: 2019, genres: ["Crime Thriller", "Government Conspiracy"], keywords: ["Surveillance", "Artificial Intelligence"], imdb: 7.9, rt: 92, popularity: 28, poster: "/6Z67d0q8Z2SLGr2JuKQeM7Q1F4l.jpg", completed: true },
  { tmdbId: 93405, type: MediaType.TV, title: "Squid Game", year: 2021, genres: ["Survival", "Psychological Thriller", "Action"], keywords: ["Dystopian Future"], imdb: 8.0, rt: 85, popularity: 300, poster: "/dDlEmu3EZ0Pgg93K2SVNLCjCSvE.jpg", completed: true },
  { tmdbId: 100088, type: MediaType.TV, title: "The Last of Us", year: 2023, genres: ["Survival", "Action", "Dystopian Future"], keywords: ["Sci-Fi"], imdb: 8.7, rt: 96, popularity: 275, poster: "/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg", completed: false },
];

async function main() {
  const profile = await prisma.profile.upsert({
    where: { id: "edwin" },
    update: { favoriteGenres: [...PREFERRED_GENRES] },
    create: {
      id: "edwin",
      name: "Edwin",
      favoriteGenres: [...PREFERRED_GENRES],
      preferredLanguages: ["en", "ml"],
      excludedLanguages: ["hi"],
      recommendationAccuracy: 92,
    },
  });

  await prisma.profile.upsert({
    where: { id: "jeswin" },
    update: { name: "Jeswin" },
    create: {
      id: "jeswin",
      name: "Jeswin",
      favoriteGenres: [...PREFERRED_GENRES],
      preferredLanguages: ["en", "ml"],
      excludedLanguages: ["hi"],
      recommendationAccuracy: 0,
    },
  });

  for (const item of watched) {
    const title = await prisma.title.upsert({
      where: { tmdbId_type: { tmdbId: item.tmdbId, type: MediaType.TV } },
      update: {},
      create: {
        tmdbId: item.tmdbId,
        type: MediaType.TV,
        title: item.title,
        year: item.year,
        language: "en",
        genres: item.genres,
        keywords: item.keywords,
        imdbRating: item.rating,
        completedSeries: true,
      },
    });
    await prisma.watchEntry.upsert({
      where: { profileId_titleId: { profileId: profile.id, titleId: title.id } },
      update: { status: WatchStatus.WATCHED },
      create: {
        profileId: profile.id,
        titleId: title.id,
        status: WatchStatus.WATCHED,
        dateWatched: new Date(),
        source: "seed",
        seasonsWatched: 1,
        minutesWatched: 600,
      },
    });
    if (["Person of Interest", "Mr. Robot", "Designated Survivor", "Scorpion", "CSI: Cyber", "The Boys", "Gen V"].includes(item.title)) {
      await prisma.feedback.upsert({
        where: { profileId_titleId: { profileId: profile.id, titleId: title.id } },
        update: { type: FeedbackType.FAVORITE },
        create: { profileId: profile.id, titleId: title.id, type: FeedbackType.FAVORITE },
      });
    }
  }

  for (const item of recommendations) {
    const imdbId = "imdbId" in item ? item.imdbId : undefined;
    const mediaType = item.type || MediaType.TV;
    await prisma.title.upsert({
      where: { tmdbId_type: { tmdbId: item.tmdbId, type: mediaType } },
      update: { imdbId },
      create: {
        tmdbId: item.tmdbId,
        imdbId,
        type: mediaType,
        title: item.title,
        year: item.year,
        language: "en",
        genres: item.genres,
        keywords: item.keywords,
        imdbRating: item.imdb,
        rottenTomatoesScore: item.rt,
        tmdbRating: item.imdb,
        popularity: item.popularity,
        posterPath: item.poster,
        completedSeries: item.completed,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
