"use client";

import { AudioLines, Play } from "lucide-react";
import Image from "next/image";

import type { DemoTrack } from "@/lib/catalog-data";
import "@/app/home-discovery.css";

const mixes = [
  { id: "slow", title: "Сбавить темп", genres: ["Эмбиент", "Лоу-фай", "Инструментальная", "Даунтемпо"] },
  { id: "rhythm", title: "Поймать ритм", genres: ["Поп", "Фонк", "Электроника"] },
];

const featuredGenres = ["Поп", "Фонк"];

export function HomeDiscovery({
  tracks,
  activeTrackId,
  playing,
  queue,
  onPlayMix,
  selectedGenre,
  onSelectGenre,
}: {
  tracks: DemoTrack[];
  activeTrackId?: string;
  playing: boolean;
  queue: DemoTrack[];
  onPlayMix: (id: string, trackIds: readonly string[]) => void;
  selectedGenre?: string;
  onSelectGenre: (genre: string) => void;
}) {
  const available = new Set(tracks.map((track) => track.genre));
  const genres = [
    ...featuredGenres.filter((name) => available.has(name)),
    ...Array.from(available).filter((name) => !featuredGenres.includes(name)),
  ];
  const queuedIds = new Set(queue.map((track) => track.id));

  return (
    <div className="home-discovery-content">
      <div className="home-mixes" role="group" aria-label="Миксы">
        {mixes.map((mix) => {
          const mixTracks = mix.genres.flatMap((genre) => tracks.filter((track) => track.genre === genre));
          const firstTrack = mixTracks[0];
          if (!firstTrack) return null;

          const ids = mixTracks.map((track) => track.id);
          const mixIsPlaying = playing && activeTrackId !== undefined && ids.includes(activeTrackId)
            && ids.length === queuedIds.size && ids.every((id) => queuedIds.has(id));

          return (
            <button
              key={mix.id}
              type="button"
              className="home-mix"
              data-mix={mix.id}
              data-playing={mixIsPlaying}
              aria-label={`Включить микс «${mix.title}»`}
              onClick={() => onPlayMix(firstTrack.id, ids)}
            >
              <Image className="home-mix__cover" src={firstTrack.cover} width={38} height={38} alt="" unoptimized />
              <span className="home-mix__title">{mix.title}</span>
              <span className="home-mix__play" aria-hidden="true">
                {mixIsPlaying ? <AudioLines /> : <Play />}
              </span>
            </button>
          );
        })}
      </div>

      {genres.length > 0 && (
        <div className="home-genre-options" role="group" aria-label="Музыкальные жанры">
          {genres.map((name) => (
            <button
              key={name}
              type="button"
              className="home-genre-option"
              aria-controls="home-collection"
              aria-pressed={name === selectedGenre}
              onClick={() => onSelectGenre(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
