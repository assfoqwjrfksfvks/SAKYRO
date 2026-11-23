"use client";

import { Heart, Pause, Play } from "lucide-react";
import Image from "next/image";

import type { usePlayer } from "@/components/use-player";
import type { DemoTrack } from "@/lib/catalog-data";
import "@/app/track-list.css";

export function formatTime(seconds: number) {
  const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

export function Cover({ track, size = 52 }: { track: DemoTrack; size?: number }) {
  return (
    <Image
      className="track-cover"
      src={track.cover}
      width={size}
      height={size}
      alt=""
      unoptimized
    />
  );
}

function Equalizer() {
  return <span className="track-equalizer" aria-hidden="true"><span /><span /><span /><span /></span>;
}

export function TrackList({ tracks, player, queueTracks = tracks, id }: {
  tracks: DemoTrack[];
  player: ReturnType<typeof usePlayer>;
  queueTracks?: DemoTrack[];
  id?: string;
}) {
  const { activeTrack, playing, favorites, playTrack, toggleFavorite, togglePlayback } = player;

  return (
    <ul className="track-list" id={id}>
      {tracks.map((track) => {
        const active = track.id === activeTrack?.id;
        const currentAndPlaying = active && playing;
        const favorite = favorites.includes(track.id);

        return (
          <li className="track" key={track.id} data-active={active} data-playing={currentAndPlaying}>
            <button
              className="track-select"
              type="button"
              aria-label={`${currentAndPlaying ? "Поставить на паузу" : "Слушать"}: ${track.title}`}
              onClick={() => currentAndPlaying ? togglePlayback() : playTrack(track.id, queueTracks.map(({ id }) => id))}
            >
              <span className="track-art">
                <Cover track={track} />
                <span className="track-art-control" aria-hidden="true">
                  {currentAndPlaying ? (
                    <>
                      <Equalizer />
                      <Pause className="track-art-pause" />
                    </>
                  ) : <Play />}
                </span>
              </span>
              <span className="track-copy">
                <span className="track-title">{track.title}</span>
                <span className="track-artist">{track.artist}</span>
                {active && <span className="track-row-meter" aria-hidden="true"><Equalizer /></span>}
              </span>
              <span className="track-genre">{track.genre}</span>
              <span className="track-time">{formatTime(track.duration)}</span>
            </button>
            <button
              type="button"
              className="icon-button track-favorite"
              aria-label={`В избранном: ${track.title}`}
              aria-pressed={favorite}
              onClick={() => toggleFavorite(track.id)}
            >
              <Heart aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
