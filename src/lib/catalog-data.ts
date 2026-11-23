export type DemoTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  cover: string;
  audio: string;
};

const initialDemoTracks: readonly DemoTrack[] = [
  {
    id: "night-signal",
    title: "Ночной сигнал",
    artist: "Северные окна",
    genre: "Эмбиент",
    duration: 30,
    cover: "/images/cover-1.webp",
    audio: "/audio/night-signal.mp3",
  },
  {
    id: "warm-noise",
    title: "Тёплый шум",
    artist: "Кассета",
    genre: "Лоу-фай",
    duration: 27,
    cover: "/images/cover-2.webp",
    audio: "/audio/warm-noise.mp3",
  },
  {
    id: "water-lines",
    title: "Линии воды",
    artist: "Тихий берег",
    genre: "Эмбиент",
    duration: 33,
    cover: "/images/cover-3.webp",
    audio: "/audio/water-lines.mp3",
  },
  {
    id: "without-orbit",
    title: "Без орбиты",
    artist: "Форма света",
    genre: "Электроника",
    duration: 26,
    cover: "/images/cover-4.webp",
    audio: "/audio/without-orbit.mp3",
  },
  {
    id: "after-rain",
    title: "После дождя",
    artist: "Ранний свет",
    genre: "Инструментальная",
    duration: 31,
    cover: "/images/cover-5.webp",
    audio: "/audio/after-rain.mp3",
  },
  {
    id: "city-sleeps",
    title: "Город спит",
    artist: "Сетчатка",
    genre: "Даунтемпо",
    duration: 29,
    cover: "/images/cover-6.webp",
    audio: "/audio/city-sleeps.mp3",
  },
];

const genreDemoTracks: readonly DemoTrack[] = [
  {
    id: "city-lights",
    title: "Огни города",
    artist: "Мягкий ток",
    genre: "Поп",
    duration: 30,
    cover: "/images/cover-7.webp",
    audio: "/audio/city-lights.mp3",
  },
  {
    id: "after-midnight",
    title: "После полуночи",
    artist: "Ночной контур",
    genre: "Фонк",
    duration: 32,
    cover: "/images/cover-8.webp",
    audio: "/audio/after-midnight.mp3",
  },
];

export const demoCatalogSeeds = [
  { name: "demo-catalog-v1", firstArtistNumber: 1, tracks: initialDemoTracks },
  { name: "demo-catalog-v2", firstArtistNumber: 7, tracks: genreDemoTracks },
] as const;

export const demoTracks: readonly DemoTrack[] = demoCatalogSeeds.flatMap((seed) => seed.tracks);
