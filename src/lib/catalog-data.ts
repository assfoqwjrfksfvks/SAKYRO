export type DemoTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  cover: string;
  audio: string;
};

export const demoTracks: readonly DemoTrack[] = [
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
