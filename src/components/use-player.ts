"use client";

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import type { DemoTrack } from "@/lib/catalog-data";

const preferenceKey = "sakyro.player.v1";
const initialVolume = 0.8;
const historyLimit = 50;

type PlayerPreferences = {
  favorites: string[];
  recentIds: string[];
};

const emptyPreferences: PlayerPreferences = { favorites: [], recentIds: [] };
const preferenceListeners = new Set<() => void>();
let memoryPreferences: string | undefined;

function subscribeToPreferences(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === preferenceKey || event.key === null) notify();
  }

  preferenceListeners.add(notify);
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

function getPreferenceSnapshot() {
  try {
    return memoryPreferences ?? window.localStorage.getItem(preferenceKey) ?? "";
  } catch {
    return "";
  }
}

function getServerPreferenceSnapshot() {
  return "";
}

function stringIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
}

function readPreferences(snapshot: string): PlayerPreferences {
  if (!snapshot) return emptyPreferences;

  try {
    const stored = JSON.parse(snapshot) as Partial<PlayerPreferences> | null;
    return { favorites: stringIds(stored?.favorites), recentIds: stringIds(stored?.recentIds) };
  } catch {
    return emptyPreferences;
  }
}

function updatePreferences(update: (previous: PlayerPreferences) => PlayerPreferences) {
  const snapshot = getPreferenceSnapshot();
  const next = JSON.stringify(update(readPreferences(snapshot)));
  if (next === snapshot) return;

  try {
    window.localStorage.setItem(preferenceKey, next);
    memoryPreferences = undefined;
  } catch {
    memoryPreferences = next;
  }

  for (const notify of preferenceListeners) notify();
}

function shuffleIds(ids: readonly string[]) {
  const shuffled = [...ids];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

type PlaybackQueue = {
  trackIds: string[];
  orderedIds: string[];
  shuffle: boolean;
};

export function usePlayer(tracks: DemoTrack[]) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const initialTrack = useRef(tracks[0]);
  const playback = useRef({ trackId: tracks[0]?.id, source: "", request: 0 });
  const [activeId, setActiveId] = useState(tracks[0]?.id);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number>();
  const [volume, updateVolume] = useState(initialVolume);
  const [repeat, setRepeat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackQueue, setPlaybackQueue] = useState<PlaybackQueue>(() => {
    const ids = tracks.map((track) => track.id);
    return { trackIds: ids, orderedIds: ids, shuffle: false };
  });

  const tracksById = new Map(tracks.map((track) => [track.id, track]));
  const activeTrack = activeId ? tracksById.get(activeId) : undefined;
  const queue = playbackQueue.orderedIds.flatMap((id) => {
    const track = tracksById.get(id);
    return track ? [track] : [];
  });
  const preferences = useSyncExternalStore(subscribeToPreferences, getPreferenceSnapshot, getServerPreferenceSnapshot);
  const { favorites, recentIds } = readPreferences(preferences);

  function loadTrack(track: DemoTrack, audio: HTMLAudioElement) {
    const source = new URL(track.audio, document.baseURI).href;
    if (playback.current.trackId === track.id && playback.current.source === source) return;

    playback.current.request++;
    playback.current.trackId = track.id;
    playback.current.source = source;
    audio.pause();
    audio.src = source;
    setActiveId(track.id);
    setPlaying(false);
    setElapsed(0);
    setMediaDuration(undefined);
  }

  function requestPlay(audio: HTMLAudioElement) {
    const request = ++playback.current.request;
    setError(null);
    if (audio.error) audio.load();

    void audio.play().catch((cause: unknown) => {
      if (playback.current.request !== request) return;
      const name = cause instanceof DOMException ? cause.name : "";
      if (name === "AbortError") return;

      setPlaying(false);
      setError(name === "NotAllowedError"
        ? "Браузер заблокировал звук. Нажмите «Играть» ещё раз."
        : "Не удалось воспроизвести трек. Попробуйте ещё раз.");
    });
  }

  function startTrack(id: string) {
    const track = tracksById.get(id);
    const audio = audioRef.current;
    if (!audio || !track) return;

    loadTrack(track, audio);
    requestPlay(audio);
  }

  function validTrackIds(ids: readonly string[]) {
    return [...new Set(ids.filter((id) => tracksById.has(id)))];
  }

  function playTrack(id: string, queueIds?: readonly string[]) {
    if (!tracksById.has(id)) return;

    if (queueIds || !playbackQueue.orderedIds.includes(id)) {
      const trackIds = validTrackIds(queueIds ?? tracks.map((track) => track.id));
      if (!trackIds.includes(id)) trackIds.unshift(id);
      const orderedIds = playbackQueue.shuffle
        ? [id, ...shuffleIds(trackIds.filter((trackId) => trackId !== id))]
        : trackIds;
      setPlaybackQueue({ ...playbackQueue, trackIds, orderedIds });
    }

    startTrack(id);
  }

  function playWave(ids: readonly string[]) {
    const trackIds = validTrackIds(ids);
    if (trackIds.length === 0) return;

    const orderedIds = playbackQueue.shuffle ? shuffleIds(trackIds) : trackIds;
    setPlaybackQueue({ ...playbackQueue, trackIds, orderedIds });
    startTrack(orderedIds[0]);
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    if (audio.paused) {
      loadTrack(activeTrack, audio);
      requestPlay(audio);
    } else {
      playback.current.request++;
      audio.pause();
    }
  }

  function advance(direction: -1 | 1, wrap: boolean) {
    const ids = queue.map((track) => track.id);
    const current = ids.indexOf(playback.current.trackId ?? "");
    const fallback = direction === 1 ? ids[0] : ids.at(-1);
    const id = ids[current + direction] ?? (wrap ? fallback : undefined);
    if (!id) return;

    if (id === playback.current.trackId) seek(0);
    startTrack(id);
  }

  function previous() {
    if ((audioRef.current?.currentTime ?? 0) > 3) {
      seek(0);
      return;
    }
    advance(-1, true);
  }

  function next() {
    advance(1, true);
  }

  function seek(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds) || !Number.isFinite(audio.duration)) return;

    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    setElapsed(audio.currentTime);
  }

  function setVolume(value: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;

    audio.volume = Math.max(0, Math.min(value, 1));
    updateVolume(audio.volume);
  }

  function toggleFavorite(id: string) {
    if (!tracksById.has(id)) return;
    updatePreferences((current) => ({
      ...current,
      favorites: current.favorites.includes(id)
        ? current.favorites.filter((favoriteId) => favoriteId !== id)
        : [...current.favorites, id],
    }));
  }

  function toggleShuffle() {
    const shuffle = !playbackQueue.shuffle;
    const id = playback.current.trackId;
    const trackIds = playbackQueue.trackIds;
    const orderedIds = shuffle && id && trackIds.includes(id)
      ? [id, ...shuffleIds(trackIds.filter((trackId) => trackId !== id))]
      : trackIds;

    setPlaybackQueue({ trackIds, orderedIds, shuffle });
  }

  function toggleRepeat() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = !audio.loop;
    setRepeat(audio.loop);
  }

  const onTrackEnd = useEffectEvent(() => {
    setPlaying(false);
    advance(1, false);
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const current = playback.current;

    const isCurrentSource = () => current.source !== "" && audio.currentSrc === current.source;

    const onPlaying = () => {
      const id = current.trackId;
      if (!id || audio.paused || audio.ended || !isCurrentSource()) return;

      setPlaying(true);
      updatePreferences((preferences) => ({
        ...preferences,
        recentIds: [id, ...preferences.recentIds.filter((recentId) => recentId !== id)].slice(0, historyLimit),
      }));
    };

    const onPause = () => {
      if (audio.paused && isCurrentSource()) setPlaying(false);
    };

    const onDurationChange = () => {
      if (isCurrentSource() && Number.isFinite(audio.duration)) setMediaDuration(audio.duration);
    };

    const onTimeUpdate = () => {
      if (isCurrentSource()) setElapsed(audio.currentTime);
    };

    const onVolumeChange = () => updateVolume(audio.volume);

    const onEnded = () => {
      if (audio.ended && isCurrentSource()) onTrackEnd();
    };

    const onError = () => {
      if (!audio.error || (audio.currentSrc && !isCurrentSource())) return;

      setPlaying(false);
      setError("Не удалось загрузить трек. Выберите другой или повторите попытку.");
    };

    const listeners = {
      playing: onPlaying,
      pause: onPause,
      durationchange: onDurationChange,
      timeupdate: onTimeUpdate,
      volumechange: onVolumeChange,
      ended: onEnded,
      error: onError,
    };

    for (const [event, handler] of Object.entries(listeners)) audio.addEventListener(event, handler);
    audio.volume = initialVolume;
    if (initialTrack.current && !current.source) {
      current.source = new URL(initialTrack.current.audio, document.baseURI).href;
      audio.src = current.source;
    }

    return () => {
      for (const [event, handler] of Object.entries(listeners)) audio.removeEventListener(event, handler);
      audio.pause();
      current.request++;
    };
  }, []);

  return {
    audioRef,
    activeTrack,
    playing,
    elapsed,
    duration: mediaDuration ?? activeTrack?.duration ?? 0,
    volume,
    favorites,
    recentIds,
    queue,
    shuffle: playbackQueue.shuffle,
    repeat,
    error,
    playTrack,
    playWave,
    togglePlayback,
    previous,
    next,
    seek,
    setVolume,
    toggleFavorite,
    toggleShuffle,
    toggleRepeat,
  };
}
