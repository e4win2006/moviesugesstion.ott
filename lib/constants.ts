export const PREFERRED_GENRES = [
  "Cybersecurity", "Hacking", "Tech Drama", "Crime Thriller", "Mystery",
  "Detective", "Government Conspiracy", "Political Thriller",
  "Intelligence Agencies", "Artificial Intelligence", "Sci-Fi", "Action",
  "Psychological Thriller", "Marvel", "DC", "Survival",
  "Dystopian Future", "Space Exploration", "Drama", "Comedy",
  "Animation", "Horror", "History", "Fantasy",
] as const;

export const WATCHED_SEED = [
  "Designated Survivor", "Person of Interest", "Paradise", "Tracker",
  "Mr. Robot", "Scorpion", "CSI: Cyber", "Bodies", "Gen V", "The Boys",
] as const;

export const TASTE_ANCHORS = [
  "Person of Interest", "Mr. Robot", "Designated Survivor", "Scorpion",
  "CSI: Cyber", "The Boys", "Gen V",
] as const;

export const CATEGORY_RULES = [
  { id: "person-of-interest", title: "Because you loved Person of Interest", tags: ["Artificial Intelligence", "Crime Thriller", "Government Conspiracy", "Surveillance"] },
  { id: "mr-robot", title: "Similar to Mr. Robot", tags: ["Hacking", "Cybersecurity", "Psychological Thriller", "Tech Drama"] },
  { id: "cybersecurity", title: "Cybersecurity & Hacking", tags: ["Cybersecurity", "Hacking", "Tech Drama"] },
  { id: "conspiracy", title: "Government Conspiracy", tags: ["Government Conspiracy", "Political Thriller", "Intelligence Agencies"] },
  { id: "ai-scifi", title: "AI & Sci-Fi", tags: ["Artificial Intelligence", "Sci-Fi", "Dystopian Future", "Space Exploration"] },
  { id: "crime", title: "Crime Thriller", tags: ["Crime Thriller", "Mystery", "Detective"] },
  { id: "heroes", title: "Marvel & DC", tags: ["Marvel", "DC", "Action"] },
  { id: "hidden-gems", title: "Hidden Gems", tags: ["Mystery", "Sci-Fi", "Psychological Thriller"] },
] as const;
