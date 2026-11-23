"use client";

import { AudioLines, Heart, ListMusic, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import type { CSSProperties } from "react";

import { Cover, formatTime } from "@/components/track-list";
import type { usePlayer } from "@/components/use-player";
import "@/app/mini-player.css";

export function MiniPlayer({
  player,
  visible,
  onOpenPlayer,
  onOpenQueue,
}: {
  player: ReturnType<typeof usePlayer>;
  visible: boolean;
  onOpenPlayer: () => void;
  onOpenQueue: () => void;
}) {
  const track = player.activeTrack;
  const elapsed = Math.min(player.elapsed, player.duration);
  const progress = player.duration ? elapsed / player.duration * 100 : 0;
  const positionLabel = `${formatTime(elapsed)} из ${formatTime(player.duration)}`;

  return (
    <div className="mini-dock" data-visible={visible} inert={!visible} aria-hidden={!visible}>
      <section className="mini-player" aria-label="Мини-плеер">
        <div className="mini-info">
          <button className="mini-track" type="button" onClick={onOpenPlayer} aria-label="Открыть плеер">
            {track ? <Cover track={track} size={38} /> : <AudioLines aria-hidden="true" />}
            <span className="mini-track-copy">
              <strong>{track?.title ?? "SAKYRO"}</strong>
              <span>{track?.artist ?? "Выберите трек"}</span>
            </span>
          </button>
          {track && (
            <button type="button" className="icon-button mini-heart" aria-label={`В избранном: ${track.title}`} aria-pressed={player.favorites.includes(track.id)} onClick={() => player.toggleFavorite(track.id)}><Heart aria-hidden="true" /></button>
          )}
        </div>
        <div className="mini-transport" role="group" aria-label="Управление воспроизведением">
          <button className="icon-button mini-extra" type="button" aria-label="Перемешать" aria-pressed={player.shuffle} onClick={player.toggleShuffle} disabled={!track}><Shuffle aria-hidden="true" /></button>
          <button className="icon-button" type="button" aria-label="Предыдущий трек" onClick={player.previous} disabled={!track}><SkipBack aria-hidden="true" /></button>
          <button className="icon-button mini-play" type="button" aria-label={player.playing ? "Пауза" : "Воспроизвести"} onClick={player.togglePlayback} disabled={!track}>
            {player.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </button>
          <button className="icon-button" type="button" aria-label="Следующий трек" onClick={player.next} disabled={!track}><SkipForward aria-hidden="true" /></button>
          <button className="icon-button mini-extra" type="button" aria-label="Повторить трек" aria-pressed={player.repeat} onClick={player.toggleRepeat} disabled={!track}><Repeat aria-hidden="true" /></button>
        </div>
        <div className="mini-timeline">
          <span aria-hidden="true">{formatTime(elapsed)}</span>
          <input
            className="mini-range"
            aria-label="Прогресс в мини-плеере"
            aria-valuetext={positionLabel}
            type="range"
            min={0}
            max={player.duration || 1}
            step={0.1}
            value={elapsed}
            style={{ "--range-value": `${progress}%` } as CSSProperties}
            onChange={(event) => player.seek(event.currentTarget.valueAsNumber)}
            disabled={!player.duration}
          />
          <span aria-hidden="true">{formatTime(player.duration)}</span>
        </div>
        <div className="mini-actions">
          <button className="icon-button" type="button" aria-label="Открыть очередь" onClick={onOpenQueue}><ListMusic aria-hidden="true" /></button>
          <label className="mini-volume">
            {player.volume > 0 ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
            <input
              className="mini-range"
              aria-label="Громкость в мини-плеере"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={player.volume}
              style={{ "--range-value": `${player.volume * 100}%` } as CSSProperties}
              onChange={(event) => player.setVolume(event.currentTarget.valueAsNumber)}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
