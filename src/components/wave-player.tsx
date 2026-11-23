"use client";

import {
  AudioLines, ChevronDown, Heart, ListMusic, Pause, Play, Repeat, Shuffle,
  SkipBack, SkipForward, SlidersHorizontal, ThumbsDown, Volume2, VolumeX,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type CSSProperties } from "react";

import { formatTime } from "@/components/track-list";
import { useWaveBackdrop, useWaveform } from "@/components/wave-media";
import type { usePlayer } from "@/components/use-player";
import "@/app/wave-player.css";

export type WavePreferences = {
  mood: string | null;
  character: string | null;
  vocal: string | null;
};

const tuningGroups = [
  { key: "mood", label: "Настроение", options: ["Спокойная", "Бодрая", "Ночная", "Фокус"] },
  { key: "character", label: "Характер", options: ["Открытия", "Любимое", "Популярное"] },
  { key: "vocal", label: "Вокал", options: ["Без слов", "С вокалом"] },
] as const;

function WaveIcon({ label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" className={`wave-icon ${className}`} aria-label={label} title={label} {...props} />;
}

export function WavePlayer({
  player,
  disliked,
  onDislike,
  onOpenQueue,
  onBrowse,
  onTune,
  preferences,
  tuningNotice,
}: {
  player: ReturnType<typeof usePlayer>;
  disliked: boolean;
  onDislike: () => void;
  onOpenQueue: () => void;
  onBrowse: () => void;
  onTune: (key: keyof WavePreferences, value: string | null) => void;
  preferences: WavePreferences;
  tuningNotice?: string;
}) {
  const track = player.activeTrack;
  const canvas = useWaveBackdrop(track?.cover);
  const bars = useWaveform(track?.audio);
  const [popover, setPopover] = useState<"tuning" | "volume" | null>(null);
  const tuningRegion = useRef<HTMLDivElement>(null);
  const volumeRegion = useRef<HTMLDivElement>(null);
  const tuningId = useId();
  const volumeId = useId();

  useEffect(() => {
    if (!popover) return;

    const region = popover === "tuning" ? tuningRegion.current : volumeRegion.current;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && !region?.contains(event.target)) setPopover(null);
    }
    function closeWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setPopover(null);
      region?.querySelector("button")?.focus();
    }

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeWithEscape, true);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape, true);
    };
  }, [popover]);

  const duration = Math.max(0, player.duration);
  const elapsed = Math.min(duration, Math.max(0, player.elapsed));
  const progress = duration ? elapsed / duration : 0;
  const favorite = track !== undefined && player.favorites.includes(track.id);
  const artwork = track ? { "--wave-image": `url(${JSON.stringify(track.cover)})` } as CSSProperties : undefined;

  return (
    <section className="wave-player" aria-label="Моя волна" data-playing={player.playing}>
      <canvas className="wave-player__backdrop" ref={canvas} aria-hidden="true" />

      <div className="wave-player__stage">
        <div className="wave-player__metadata">
          <h1>{track?.title ?? "Моя волна"}</h1>
          {track && <p>{track.artist}</p>}
        </div>

        <div className="wave-player__artwork" style={artwork} aria-hidden="true">
          {track
            ? <Image className="wave-player__cover" src={track.cover} width={320} height={320} alt="" unoptimized priority />
            : <AudioLines className="wave-player__artwork-empty" />}
        </div>

        <div className="wave-player__controls">
          <div className="wave-tools">
            <div className="wave-tools__side">
              <div className="wave-volume" ref={volumeRegion}>
                <WaveIcon
                  label="Громкость"
                  aria-expanded={popover === "volume"}
                  aria-controls={volumeId}
                  onClick={() => setPopover((current) => current === "volume" ? null : "volume")}
                >
                  {player.volume > 0 ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
                </WaveIcon>
                <div className="wave-volume__popover" id={volumeId} hidden={popover !== "volume"}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={player.volume}
                    aria-label="Уровень громкости"
                    aria-valuetext={`${Math.round(player.volume * 100)}%`}
                    onKeyDown={(event) => event.stopPropagation()}
                    onChange={(event) => player.setVolume(event.currentTarget.valueAsNumber)}
                  />
                  <span aria-hidden="true">{Math.round(player.volume * 100)}%</span>
                </div>
              </div>
              <WaveIcon label="Не нравится" aria-pressed={disliked} onClick={onDislike} disabled={!track}>
                <ThumbsDown aria-hidden="true" />
              </WaveIcon>
            </div>

            <div className="wave-seek">
              <time dateTime={`PT${Math.floor(elapsed)}S`} aria-hidden="true">{formatTime(elapsed)}</time>
              <div className="wave-seek__track">
                <div className="wave-seek__bars" aria-hidden="true">
                  {bars.map((height, index) => (
                    <span
                      key={index}
                      data-past={(index + 0.5) / bars.length <= progress}
                      style={{ "--bar-size": height.toFixed(3) } as CSSProperties}
                    />
                  ))}
                </div>
                <input
                  className="wave-seek__input"
                  type="range"
                  min={0}
                  max={duration || 1}
                  step="any"
                  value={elapsed}
                  aria-label="Позиция воспроизведения"
                  aria-valuetext={`${formatTime(elapsed)} из ${formatTime(duration)}`}
                  disabled={!duration}
                  onKeyDown={(event) => event.stopPropagation()}
                  onChange={(event) => player.seek(event.currentTarget.valueAsNumber)}
                />
              </div>
              <time dateTime={`PT${Math.floor(duration)}S`} aria-hidden="true">{formatTime(duration)}</time>
            </div>

            <div className="wave-tools__side">
              <WaveIcon
                label="В избранное"
                className="wave-icon--favorite"
                aria-pressed={favorite}
                onClick={() => { if (track) player.toggleFavorite(track.id); }}
                disabled={!track}
              >
                <Heart aria-hidden="true" />
              </WaveIcon>
              <WaveIcon label="Очередь" onClick={onOpenQueue} disabled={!player.queue.length}>
                <ListMusic aria-hidden="true" />
              </WaveIcon>
            </div>
          </div>

          <div className="wave-transport" role="group" aria-label="Управление воспроизведением">
            <WaveIcon label="Перемешать" aria-pressed={player.shuffle} onClick={player.toggleShuffle} disabled={!player.queue.length}>
              <Shuffle aria-hidden="true" />
            </WaveIcon>
            <WaveIcon label="Предыдущий трек" className="wave-transport__skip" onClick={player.previous} disabled={!track}>
              <SkipBack aria-hidden="true" />
            </WaveIcon>
            <WaveIcon label={player.playing ? "Пауза" : "Воспроизвести"} className="wave-transport__play" onClick={player.togglePlayback} disabled={!track}>
              {player.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </WaveIcon>
            <WaveIcon label="Следующий трек" className="wave-transport__skip" onClick={player.next} disabled={!track}>
              <SkipForward aria-hidden="true" />
            </WaveIcon>
            <WaveIcon label="Повторить трек" aria-pressed={player.repeat} onClick={player.toggleRepeat} disabled={!track}>
              <Repeat aria-hidden="true" />
            </WaveIcon>
          </div>

          <div className="wave-tuning" ref={tuningRegion}>
            <button
              className="wave-tuning__toggle"
              type="button"
              aria-expanded={popover === "tuning"}
              aria-controls={tuningId}
              onClick={() => setPopover((current) => current === "tuning" ? null : "tuning")}
            >
              <SlidersHorizontal aria-hidden="true" />
              Настроить волну
            </button>
            <div className="wave-tuning__popover" id={tuningId} hidden={popover !== "tuning"}>
              {tuningGroups.map(({ key, label, options }) => (
                <fieldset className="wave-tuning__group" key={key}>
                  <legend>{label}</legend>
                  <div className="wave-tuning__options">
                    {options.map((option) => (
                      <button
                        type="button"
                        key={option}
                        aria-pressed={preferences[key] === option}
                        onClick={() => onTune(key, preferences[key] === option ? null : option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
              {tuningNotice && <p className="wave-tuning__notice" role="status">{tuningNotice}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="wave-player__edge">
        <button className="wave-player__browse" type="button" onClick={onBrowse}>
          Подборки и треки
          <ChevronDown aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
