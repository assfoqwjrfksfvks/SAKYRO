"use client";

import { AudioLines, Play } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";

import type { DemoTrack } from "@/lib/catalog-data";
import "@/app/home-discovery.css";

const mixes = [
  { id: "slow", title: "Сбавить темп", genres: ["Эмбиент", "Лоу-фай", "Инструментальная", "Даунтемпо"] },
  { id: "rhythm", title: "Поймать ритм", genres: ["Поп", "Фонк", "Электроника"] },
];

const featuredGenres = ["Поп", "Фонк"];
const trackPlural = new Intl.PluralRules("ru");

function trackCount(count: number) {
  const form = trackPlural.select(count);
  if (form === "one") return `${count} трек`;
  if (form === "few") return `${count} трека`;
  return `${count} треков`;
}

export function HomeDiscovery({
  tracks,
  activeTrackId,
  playing,
  queue,
  onPlayMix,
  renderTracks,
}: {
  tracks: DemoTrack[];
  activeTrackId?: string;
  playing: boolean;
  queue: DemoTrack[];
  onPlayMix: (id: string, trackIds: readonly string[]) => void;
  renderTracks: (tracks: DemoTrack[]) => ReactNode;
}) {
  const [genre, setGenre] = useState<string>();
  const available = new Set(tracks.map((track) => track.genre));
  const genres = [
    ...featuredGenres.filter((name) => available.has(name)),
    ...Array.from(available).filter((name) => !featuredGenres.includes(name)),
  ];
  const selectedGenre = genre && available.has(genre) ? genre : genres[0];
  const queuedIds = new Set(queue.map((track) => track.id));

  return (
    <div className="home-discovery-content">
      <section className="home-discovery-section" aria-labelledby="home-mixes-heading">
        <h2 id="home-mixes-heading">Миксы</h2>
        <div className="home-mixes">
          {mixes.map((mix) => {
            const mixTracks = mix.genres.flatMap((genre) => tracks.filter((track) => track.genre === genre));
            const firstTrack = mixTracks[0];
            if (!firstTrack) return null;

            const ids = mixTracks.map((track) => track.id);
            const mixIsPlaying = playing && activeTrackId !== undefined && ids.includes(activeTrackId)
              && ids.length === queuedIds.size && ids.every((id) => queuedIds.has(id));
            const count = trackCount(ids.length);

            return (
              <button
                key={mix.id}
                type="button"
                className="home-mix"
                data-mix={mix.id}
                data-playing={mixIsPlaying}
                aria-label={`Включить микс «${mix.title}», ${count}`}
                onClick={() => onPlayMix(firstTrack.id, ids)}
              >
                <span className="home-mix__covers" aria-hidden="true">
                  {mixTracks.slice(0, 3).map((track) => (
                    <Image
                      key={track.id}
                      className="home-mix__cover"
                      src={track.cover}
                      width={84}
                      height={84}
                      alt=""
                      unoptimized
                    />
                  ))}
                </span>
                <span className="home-mix__detail">
                  <span className="home-mix__title">{mix.title}</span>
                  <span className="home-mix__count">{count}</span>
                </span>
                <span className="home-mix__play" aria-hidden="true">
                  {mixIsPlaying ? <AudioLines /> : <Play />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {genres.length > 0 && (
        <section className="home-discovery-section" aria-labelledby="home-genres-heading">
          <h2 id="home-genres-heading">Жанры</h2>
          <div className="home-genre-options" role="group" aria-label="Музыкальные жанры">
            {genres.map((name) => (
              <button
                key={name}
                type="button"
                className="home-genre-option"
                aria-controls="home-genre-tracks"
                aria-pressed={name === selectedGenre}
                onClick={() => setGenre(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="home-genre-tracks" id="home-genre-tracks">
            {renderTracks(tracks.filter((track) => track.genre === selectedGenre))}
          </div>
        </section>
      )}
    </div>
  );
}
