"use client";

import {
  AudioLines,
  Heart,
  House,
  LibraryBig,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { HomeDiscovery } from "@/components/home-discovery";
import { usePlayer } from "@/components/use-player";
import type { DemoTrack } from "@/lib/catalog-data";
import "@/app/home-wave.css";

type Variant = "a" | "b";
type Collection = "recent" | "favorites" | "new" | "for-you";
type Panel = "search" | "library" | "queue" | "player";
type Player = ReturnType<typeof usePlayer>;

const recentPreviewSize = 3;

const collectionTitles: Record<Collection, string> = {
  recent: "Недавние треки",
  favorites: "Любимые треки",
  new: "Новые треки",
  "for-you": "Для тебя",
};

const panelTitles: Record<Panel, string> = {
  search: "Поиск",
  library: "Медиатека",
  queue: "Очередь",
  player: "Сейчас играет",
};

function formatTime(seconds: number) {
  const wholeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function Cover({ track, size = 52 }: { track: DemoTrack; size?: number }) {
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

function Brand() {
  return (
    <div className="brand" aria-label="SAKYRO">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M6.5 19.5 13 9l4.1 13L24 12.5" />
          <circle cx="25.5" cy="9.5" r="1.2" />
        </svg>
      </span>
      <span>SAKYRO<span className="brand-period" aria-hidden="true">.</span></span>
    </div>
  );
}

function TrackList({ tracks, player, queueTracks = tracks, id }: {
  tracks: DemoTrack[];
  player: Player;
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
              onClick={() => active ? togglePlayback() : playTrack(track.id, queueTracks.map(({ id }) => id))}
            >
              <span className="track-art">
                <Cover track={track} />
                <span className="track-art-control" aria-hidden="true">
                  {currentAndPlaying ? <Pause /> : <Play />}
                </span>
              </span>
              <span className="track-copy">
                <span className="track-title">{track.title}</span>
                <span className="track-artist">{track.artist}</span>
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
              <Heart />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Transport({ player }: { player: Player }) {
  return (
    <div className="transport" aria-label="Управление воспроизведением">
      <button className="icon-button transport-extra" type="button" aria-label="Перемешать очередь" aria-pressed={player.shuffle} onClick={player.toggleShuffle}>
        <Shuffle />
      </button>
      <button className="icon-button transport-skip transport-previous" type="button" aria-label="Предыдущий трек" onClick={player.previous}>
        <SkipBack />
      </button>
      <button
        type="button"
        className="icon-button transport-play"
        aria-label={player.playing ? "Пауза" : "Воспроизвести"}
        onClick={player.togglePlayback}
      >
        {player.playing ? <Pause /> : <Play />}
      </button>
      <button className="icon-button transport-skip" type="button" aria-label="Следующий трек" onClick={player.next}>
        <SkipForward />
      </button>
      <button className="icon-button transport-extra" type="button" aria-label="Повторить трек" aria-pressed={player.repeat} onClick={player.toggleRepeat}>
        <Repeat />
      </button>
    </div>
  );
}

function Timeline({ player }: { player: Player }) {
  const duration = player.duration || player.activeTrack?.duration || 0;
  const progress = duration ? Math.min(100, player.elapsed / duration * 100) : 0;

  return (
    <div className="timeline">
      <span>{formatTime(player.elapsed)}</span>
      <input
        type="range"
        className="player-range"
        aria-label="Позиция воспроизведения"
        aria-valuetext={`${formatTime(player.elapsed)} из ${formatTime(duration)}`}
        min={0}
        max={duration || 1}
        step={0.1}
        value={Math.min(player.elapsed, duration)}
        style={{ "--range-value": `${progress}%` } as CSSProperties}
        disabled={!duration}
        onChange={(event) => player.seek(event.currentTarget.valueAsNumber)}
      />
      <span>{formatTime(duration)}</span>
    </div>
  );
}

function Volume({ player }: { player: Player }) {
  return (
    <div className="volume">
      <Volume2 aria-hidden="true" />
      <input
        aria-label="Громкость"
        className="player-range"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={player.volume}
        style={{ "--range-value": `${player.volume * 100}%` } as CSSProperties}
        onChange={(event) => player.setVolume(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}

function PlayerBar({ player, onPanel }: { player: Player; onPanel: (panel: Panel) => void }) {
  const track = player.activeTrack;
  const progress = player.duration ? Math.min(100, player.elapsed / player.duration * 100) : 0;
  const favorite = track ? player.favorites.includes(track.id) : false;

  return (
    <section className="player-bar" aria-label="Мини-плеер">
      <div className="mobile-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="player-track">
        <button className="player-track-button" type="button" onClick={() => onPanel("player")} aria-label="Открыть плеер">
          {track ? <Cover track={track} size={48} /> : <span className="player-empty-art"><AudioLines /></span>}
          <span className="track-copy">
            <span className="track-title">{track?.title ?? "SAKYRO"}</span>
            <span className="track-artist">{track?.artist ?? "Выберите трек"}</span>
          </span>
        </button>
        {track && (
          <button
            className="icon-button player-favorite"
            type="button"
            aria-label={`В избранном: ${track.title}`}
            aria-pressed={favorite}
            onClick={() => player.toggleFavorite(track.id)}
          >
            <Heart />
          </button>
        )}
      </div>
      <div className="player-center">
        <Transport player={player} />
        <Timeline player={player} />
      </div>
      <div className="player-tools">
        <button className="icon-button queue-button" type="button" aria-label="Открыть очередь" onClick={() => onPanel("queue")}>
          <ListMusic />
        </button>
        <Volume player={player} />
      </div>
    </section>
  );
}

export function Home({ tracks, initialVariant }: { tracks: DemoTrack[]; initialVariant: Variant }) {
  const [variant, setVariant] = useState(initialVariant);
  const [collection, setCollection] = useState<Collection>("recent");
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState("");
  const [waveActive, setWaveActive] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const closePanelButton = useRef<HTMLButtonElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLElement>(null);
  const player = usePlayer(tracks);
  const { audioRef, favorites, recentIds, queue, error, playing, playWave, togglePlayback } = player;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (panel && !element.open) element.showModal();
    if (!panel && element.open) element.close();
    if (panel === "search") searchField.current?.focus();
    else if (panel) closePanelButton.current?.focus();
  }, [panel]);

  const favoriteTracks = tracks.filter(({ id }) => favorites.includes(id));
  const recentTracks = recentIds
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is DemoTrack => Boolean(track));
  const preferredGenres = new Set(favoriteTracks.concat(recentTracks.slice(0, 3)).map(({ genre }) => genre));
  const selectedTracks = [...tracks].sort((first, second) => {
    const score = (track: DemoTrack) => Number(preferredGenres.has(track.genre)) * 2 - Number(recentIds.includes(track.id));
    return score(second) - score(first);
  });
  const visibleTracks: Record<Collection, DemoTrack[]> = {
    recent: recentTracks.length ? recentTracks : tracks,
    favorites: favoriteTracks,
    new: [...tracks].reverse(),
    "for-you": selectedTracks,
  };
  const normalizedQuery = query.trim().toLocaleLowerCase("ru-RU");
  const searchResults = tracks.filter((track) =>
    `${track.title} ${track.artist} ${track.genre}`.toLocaleLowerCase("ru-RU").includes(normalizedQuery),
  );
  const collectionTracks = visibleTracks[collection];
  const canExpandRecent = collection === "recent" && collectionTracks.length > recentPreviewSize;
  const displayedTracks = canExpandRecent && !showAllRecent ? collectionTracks.slice(0, recentPreviewSize) : collectionTracks;

  function changeVariant(nextVariant: Variant) {
    setVariant(nextVariant);
    const url = new URL(window.location.href);
    if (nextVariant === "b") url.searchParams.set("variant", "b");
    else url.searchParams.delete("variant");
    window.history.replaceState(null, "", url);
  }

  function showCollection(nextCollection: Collection, scroll = false) {
    setCollection(nextCollection);
    setShowAllRecent(false);
    setPanel(null);
    if (scroll) {
      window.requestAnimationFrame(() => {
        list.current?.focus({ preventScroll: true });
        list.current?.scrollIntoView({ block: "start" });
      });
    }
  }

  function openPanel(nextPanel: Panel) {
    if (nextPanel === "search") setQuery("");
    setPanel(nextPanel);
  }

  const waveFinished = !playing && player.duration > 0 && player.elapsed >= player.duration;
  const waveCanResume = waveActive && player.activeTrack && !waveFinished;

  function startWave() {
    if (waveCanResume) {
      togglePlayback();
      return;
    }
    setWaveActive(true);
    playWave(selectedTracks.map(({ id }) => id));
  }

  const wavePlaying = waveActive && playing;
  const waveLabel = wavePlaying ? "Пауза" : waveCanResume ? "Продолжить" : "Слушать волну";
  const trackPlayer = {
    ...player,
    playTrack: (id: string, trackIds?: readonly string[]) => {
      setWaveActive(false);
      player.playTrack(id, trackIds);
    },
  };

  const navigation = (
    <>
      <button type="button" className="nav-item" aria-label="Главная" aria-current={collection !== "favorites" ? "page" : undefined} onClick={() => { showCollection("recent"); window.scrollTo({ top: 0 }); }}>
        <House /><span>Главная</span>
      </button>
      <button type="button" className="nav-item" aria-label="Поиск" onClick={() => openPanel("search")}>
        <Search /><span>Поиск</span>
      </button>
      <button type="button" className="nav-item" aria-label="Любимое" aria-current={collection === "favorites" ? "page" : undefined} onClick={() => showCollection("favorites", true)}>
        <Heart /><span>Любимое</span>
      </button>
      <button type="button" className="nav-item" aria-label="Медиатека" onClick={() => openPanel("library")}>
        <LibraryBig /><span>Медиатека</span>
      </button>
    </>
  );

  return (
    <div className="app-shell" data-variant={variant}>
      <audio ref={audioRef} preload="metadata" />

      <main className="main">
        <div className="home-intro">
          <header className="main-header">
            <Brand />
            <nav aria-label="Основная навигация" className="desktop-nav">{navigation}</nav>
            <div className="variant-control" role="group" aria-label="Вариант дизайна">
              <button type="button" className="variant-button" aria-pressed={variant === "a"} onClick={() => changeVariant("a")} aria-label="Вариант A" title="Сиреневый">
                <span className="variant-swatch" aria-hidden="true" />
              </button>
              <button type="button" className="variant-button" aria-pressed={variant === "b"} onClick={() => changeVariant("b")} aria-label="Вариант B" title="Нефритовый">
                <span className="variant-swatch" aria-hidden="true" />
              </button>
            </div>
          </header>

          <section className="home-wave" aria-labelledby="wave-heading" data-playing={wavePlaying}>
            <div className="home-wave__art" aria-hidden="true" />
            <div className="home-wave__content">
              <h1 className="home-wave__title" id="wave-heading"><span>Моя</span>{" "}<span>волна</span></h1>
              <button type="button" className="home-wave__play" onClick={startWave} disabled={!tracks.length}>
                <span className="home-wave__play-icon" aria-hidden="true">{wavePlaying ? <Pause /> : <Play />}</span>
                <span className="home-wave__play-label">{waveLabel}</span>
              </button>
            </div>
          </section>
        </div>

        <div className="collection-tabs home-quick-actions" role="group" aria-label="Подборки">
          <button type="button" aria-controls="home-collection" aria-pressed={collection === "favorites"} onClick={() => showCollection(collection === "favorites" ? "recent" : "favorites", true)}>
            <Heart /><span>Любимое</span>
          </button>
          <button type="button" aria-controls="home-collection" aria-pressed={collection === "new"} onClick={() => showCollection(collection === "new" ? "recent" : "new", true)}>
            <Sparkles /><span>Новое</span>
          </button>
          <button type="button" aria-controls="home-collection" aria-pressed={collection === "for-you"} onClick={() => showCollection(collection === "for-you" ? "recent" : "for-you", true)}>
            <AudioLines /><span>Для тебя</span>
          </button>
        </div>

        <section className="home-discovery" id="home-discovery" aria-labelledby="home-discovery-heading">
          <HomeDiscovery
            tracks={tracks}
            activeTrackId={player.activeTrack?.id}
            playing={playing}
            queue={queue}
            onPlayMix={trackPlayer.playTrack}
            renderTracks={(genreTracks) => <TrackList tracks={genreTracks} player={trackPlayer} />}
          />
        </section>

        <section className="home-feed" id="home-feed" aria-label="Треки">
          <section className="collection" id="home-collection" ref={list} tabIndex={-1} aria-labelledby="collection-heading">
            <header className="collection-header">
              <h2 id="collection-heading">{collectionTitles[collection]}</h2>
              {canExpandRecent ? (
                <button type="button" className="collection-expand" aria-controls="home-collection-tracks" aria-expanded={showAllRecent} onClick={() => setShowAllRecent((value) => !value)}>
                  {showAllRecent ? "Свернуть" : recentTracks.length ? "Вся история" : "Все демотреки"}
                </button>
              ) : collection === "recent" && <span>{recentTracks.length ? "История" : "Демокаталог"}</span>}
              {collection === "for-you" && <span>{preferredGenres.size ? "По вашим жанрам" : "Стартовая подборка"}</span>}
            </header>
            {displayedTracks.length > 0
              ? <TrackList id="home-collection-tracks" tracks={displayedTracks} queueTracks={collectionTracks} player={trackPlayer} />
              : <p className="empty-state">{collection === "favorites" ? "Нажмите на сердце рядом с треком, чтобы сохранить его здесь." : "В этой подборке пока нет треков."}</p>}
          </section>
        </section>
      </main>

      {error && <div className="player-error" role="status">{error}</div>}
      <div className="playback-dock">
        <PlayerBar player={player} onPanel={openPanel} />
        <nav aria-label="Основная навигация" className="bottom-nav">{navigation}</nav>
      </div>

      <dialog
        ref={dialog}
        className="panel"
        aria-labelledby="panel-heading"
        onClose={() => setPanel(null)}
        onClick={(event) => { if (event.target === event.currentTarget) setPanel(null); }}
      >
        {panel && (
          <div className="panel-inner">
            <div className="panel-header">
              <h2 id="panel-heading">{panelTitles[panel]}</h2>
              <button type="button" ref={closePanelButton} className="icon-button panel-close" aria-label="Закрыть" onClick={() => setPanel(null)}>
                <X />
              </button>
            </div>
            {panel === "search" && (
              <>
                <label className="search-field">
                  <Search aria-hidden="true" />
                  <input ref={searchField} aria-label="Трек, артист или жанр" type="search" value={query} placeholder="Трек, артист или жанр" onChange={(event) => setQuery(event.currentTarget.value)} />
                </label>
                {searchResults.length
                  ? <TrackList tracks={searchResults} player={trackPlayer} />
                  : <p className="empty-state">Совпадений нет. Попробуйте другой запрос.</p>}
              </>
            )}
            {panel === "library" && (
              <div className="library-links">
                <button type="button" onClick={() => showCollection("favorites", true)}><Heart />Любимые треки<span>{favoriteTracks.length}</span></button>
                <button type="button" onClick={() => showCollection("recent", true)}><AudioLines />Недавние треки<span>{recentTracks.length}</span></button>
              </div>
            )}
            {panel === "queue" && (
              queue.length ? <TrackList tracks={queue} player={trackPlayer} /> : <p className="empty-state">Включите трек или «Мою волну», чтобы заполнить очередь.</p>
            )}
            {panel === "player" && (
              <div className="expanded-player">
                {player.activeTrack && <Cover track={player.activeTrack} size={320} />}
                <div className="expanded-details">
                  <div>
                    <h3>{player.activeTrack?.title ?? "Трек не выбран"}</h3>
                    {player.activeTrack && <p>{player.activeTrack.artist}</p>}
                  </div>
                  {player.activeTrack && (
                    <button className="icon-button" type="button" aria-label={`В избранном: ${player.activeTrack.title}`} aria-pressed={favorites.includes(player.activeTrack.id)} onClick={() => { if (player.activeTrack) player.toggleFavorite(player.activeTrack.id); }}>
                      <Heart />
                    </button>
                  )}
                </div>
                <Timeline player={player} />
                <Transport player={player} />
                <div className="expanded-tools">
                  <Volume player={player} />
                  <button type="button" className="icon-button" aria-label="Открыть очередь" onClick={() => openPanel("queue")}><ListMusic /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </div>
  );
}
