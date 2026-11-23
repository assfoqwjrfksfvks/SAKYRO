"use client";

import {
  AudioLines,
  Heart,
  House,
  LibraryBig,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState, type MouseEvent } from "react";

import { FavoritesScreen, LibraryScreen, SearchScreen } from "@/components/browse-screens";
import { HomeDiscovery } from "@/components/home-discovery";
import { MiniPlayer } from "@/components/mini-player";
import { TrackList } from "@/components/track-list";
import { usePlayer } from "@/components/use-player";
import { WavePlayer, type WavePreferences } from "@/components/wave-player";
import type { DemoTrack } from "@/lib/catalog-data";

export type Screen = "home" | "search" | "favorites" | "library";
export type Variant = "a" | "b";

type Collection = "recent" | "favorites" | "new" | "for-you";

const navigation = [
  { id: "home", title: "Главная", Icon: House },
  { id: "search", title: "Поиск", Icon: Search },
  { id: "favorites", title: "Любимое", Icon: Heart },
  { id: "library", title: "Медиатека", Icon: LibraryBig },
] as const;

const accents = [
  { id: "a", label: "Лавандовый акцент" },
  { id: "b", label: "Сиренево-синий акцент" },
] as const;

const filters = [
  { id: "favorites", title: "Любимое", Icon: Heart },
  { id: "new", title: "Новое", Icon: Sparkles },
  { id: "for-you", title: "Для тебя", Icon: AudioLines },
] as const;

const collectionTitles: Record<Collection, string> = {
  recent: "Недавние треки",
  favorites: "Любимые треки",
  new: "Новые треки",
  "for-you": "Для тебя",
};

const moodGenres: Record<string, readonly string[]> = {
  "Спокойная": ["Эмбиент", "Лоу-фай", "Инструментальная"],
  "Бодрая": ["Поп", "Электроника", "Фонк"],
  "Ночная": ["Фонк", "Даунтемпо", "Эмбиент"],
  "Фокус": ["Инструментальная", "Лоу-фай", "Даунтемпо"],
};

const emptyWave: WavePreferences = { mood: null, character: null, vocal: null };
const previewSize = 6;
const seekStep = 5;

function readScreen(value: unknown): Screen {
  return value === "search" || value === "favorites" || value === "library" ? value : "home";
}

function screenHref(screen: Screen, variant: Variant, query = "") {
  const params = new URLSearchParams();
  if (screen !== "home") params.set("tab", screen);
  if (screen === "search" && query) params.set("q", query);
  if (variant === "b") params.set("variant", variant);
  const search = params.toString();

  return search ? `/?${search}` : "/";
}

function Brand() {
  return (
    <>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M6.5 19.5 13 9l4.1 13L24 12.5" />
          <circle cx="25.5" cy="9.5" r="1.2" />
        </svg>
      </span>
      <span>SAKYRO<span className="brand-period">.</span></span>
    </>
  );
}

export function Home({
  tracks,
  initialVariant,
  initialScreen,
  initialQuery,
}: {
  tracks: DemoTrack[];
  initialVariant: Variant;
  initialScreen: Screen;
  initialQuery: string;
}) {
  const [screen, setScreen] = useState(initialScreen);
  const [variant, setVariant] = useState(initialVariant);
  const [searchRequest, setSearchRequest] = useState({ query: initialQuery, revision: 0 });
  const [collection, setCollection] = useState<Collection>("recent");
  const [genre, setGenre] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const [belowFold, setBelowFold] = useState(false);
  const [preferences, setPreferences] = useState(emptyWave);
  const [profileOpen, setProfileOpen] = useState(false);
  const feedRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLElement>(null);
  const queueDialog = useRef<HTMLDialogElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const waveMode = useRef(true);
  const waveStarted = useRef(false);
  const player = usePlayer(tracks);
  const { activeTrack, favorites, recentIds, dislikedIds, playCounts } = player;

  const favoriteTracks = tracks.filter(({ id }) => favorites.includes(id));
  const recentTracks = recentIds.flatMap((id) => {
    const track = tracks.find((item) => item.id === id);
    return track ? [track] : [];
  });
  const preferredGenres = new Set(favoriteTracks.concat(recentTracks.slice(0, 3)).map((track) => track.genre));

  function waveTracks(tuning: WavePreferences, excluded = dislikedIds) {
    if (tuning.vocal === "С вокалом") return [];
    const preferredMood = tuning.mood ? moodGenres[tuning.mood] ?? [] : [];

    function score(track: DemoTrack) {
      let value = preferredGenres.has(track.genre) ? 2 : 0;
      if (preferredMood.includes(track.genre)) value += 12;
      if (tuning.character === "Любимое" && favorites.includes(track.id)) value += 8;
      else if (tuning.character === "Популярное") value += Math.min(10, playCounts[track.id] ?? 0);
      else if (tuning.character === "Открытия" && !recentIds.includes(track.id)) value += 8;
      return value - (recentIds.includes(track.id) ? 1 : 0);
    }

    return tracks.filter((track) => !excluded.includes(track.id)).sort((a, b) => score(b) - score(a));
  }

  function tune(key: keyof WavePreferences, value: string | null) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    const nextTracks = waveTracks(next);
    if (!nextTracks.length) return;

    waveMode.current = true;
    waveStarted.current ||= player.playing || player.elapsed > 0;
    player.setWaveQueue(nextTracks.map(({ id }) => id));
  }

  function dislike() {
    if (!activeTrack) return;
    player.toggleDislike(activeTrack.id);
    if (!waveMode.current) return;
    const nextExcluded = dislikedIds.includes(activeTrack.id)
      ? dislikedIds.filter((id) => id !== activeTrack.id)
      : [...dislikedIds, activeTrack.id];
    player.setWaveQueue(waveTracks(preferences, nextExcluded).map(({ id }) => id));
  }

  function togglePlayback() {
    if (!waveMode.current || waveStarted.current || player.playing) {
      player.togglePlayback();
      return;
    }

    const nextTracks = waveTracks(preferences);
    if (nextTracks.length === 0) {
      player.togglePlayback();
      return;
    }
    waveStarted.current = true;
    player.playTrack(nextTracks[0].id, nextTracks.map(({ id }) => id));
  }

  function playTrack(id: string, ids?: readonly string[]) {
    waveMode.current = false;
    player.playTrack(id, ids);
  }

  const sharedPlayer = { ...player, playTrack, togglePlayback };
  const recommendations = waveTracks(preferences);
  const tuningNotice = preferences.vocal === "С вокалом"
    ? "В демокаталоге пока нет треков с вокалом. Текущая очередь сохранена."
    : recommendations.length === 0
      ? "Все треки скрыты. Снимите отметку «Не нравится», чтобы вернуть трек в волну."
      : preferences.character === "Популярное"
      ? "В деморежиме учитываются ваши прослушивания."
      : undefined;

  function goTo(nextScreen: Screen, query = "") {
    if (nextScreen !== screen) {
      window.history.pushState(null, "", screenHref(nextScreen, variant, query));
      setScreen(nextScreen);
      setBelowFold(false);
      window.scrollTo({ top: 0, behavior: "instant" });
    } else if (nextScreen === "search") {
      window.history.replaceState(null, "", screenHref(nextScreen, variant, query));
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (nextScreen === "search") setSearchRequest(({ revision }) => ({ query, revision: revision + 1 }));
    setProfileOpen(false);
  }

  function navigate(event: MouseEvent<HTMLAnchorElement>, nextScreen: Screen) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    goTo(nextScreen);
  }

  function switchVariant(next: Variant) {
    if (next === variant) return;
    const url = new URL(window.location.href);
    if (next === "b") url.searchParams.set("variant", next);
    else url.searchParams.delete("variant");
    window.history.replaceState(null, "", url);
    setVariant(next);
  }

  useEffect(() => {
    function onPopState() {
      const params = new URLSearchParams(window.location.search);
      setScreen(readScreen(params.get("tab")));
      setVariant(params.get("variant") === "b" ? "b" : "a");
      setSearchRequest(({ revision }) => ({ query: params.get("q") ?? "", revision: revision + 1 }));
      setBelowFold(false);
      setProfileOpen(false);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || screen !== "home") return;

    // Show the dock after the feed has entered the lower fifth of the viewport.
    const observer = new IntersectionObserver(([entry]) => setBelowFold(entry.isIntersecting), {
      rootMargin: "0px 0px -20% 0px",
    });
    observer.observe(feed);
    return () => observer.disconnect();
  }, [screen]);

  useEffect(() => {
    if (!profileOpen) return;

    function onOutside(event: PointerEvent) {
      if (event.target instanceof Node && !profileRef.current?.contains(event.target)) setProfileOpen(false);
    }

    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      profileButton.current?.focus();
    }

    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const onPlaybackKey = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (target?.isContentEditable || target?.closest("input, textarea, select")) return;

    if (event.code === "Space") {
      if (target?.closest("button, summary, [role=button]")) return;
      event.preventDefault();
      if (!event.repeat) togglePlayback();
    } else if (event.code === "ArrowLeft" || event.code === "ArrowRight") {
      event.preventDefault();
      const direction = event.code === "ArrowLeft" ? -1 : 1;
      player.seek((player.audioRef.current?.currentTime ?? player.elapsed) + seekStep * direction);
    }
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => onPlaybackKey(event);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function scrollToSection(section: HTMLElement | null) {
    if (!section) return;
    section.focus({ preventScroll: true });
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
    section.scrollIntoView({ behavior, block: "start" });
  }

  const collections = {
    recent: recentTracks.length ? recentTracks : tracks,
    favorites: favoriteTracks,
    new: [...tracks].reverse(),
    "for-you": recommendations,
  };
  const collectionTracks = genre ? tracks.filter((track) => track.genre === genre) : collections[collection];
  const showRecent = !genre && collection === "recent";
  const displayedTracks = showRecent && !showAll ? collectionTracks.slice(0, previewSize) : collectionTracks;
  const canExpand = showRecent && collectionTracks.length > previewSize;

  function selectFilter(filter: Collection) {
    setCollection(!genre && collection === filter ? "recent" : filter);
    setGenre(undefined);
    setShowAll(false);
  }

  function selectGenre(nextGenre: string) {
    setGenre(genre === nextGenre ? undefined : nextGenre);
    setCollection("recent");
    setShowAll(false);
    scrollToSection(listRef.current);
  }

  function openPlayer() {
    if (screen === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    goTo("home");
  }

  return (
    <div className="app-shell" data-variant={variant} data-screen={screen} data-wave-top={screen === "home" && !belowFold}>
      <audio ref={player.audioRef} preload="metadata" />
      <header className="app-header">
        <div className="header-inner">
          <a className="brand" href={screenHref("home", variant)} onClick={(event) => navigate(event, "home")}><Brand /></a>
          <nav className="main-nav" aria-label="Основная навигация">
            {navigation.map(({ id, title, Icon }) => (
              <a key={id} href={screenHref(id, variant)} aria-current={screen === id ? "page" : undefined} onClick={(event) => navigate(event, id)}>
                <Icon aria-hidden="true" /><span>{title}</span>
              </a>
            ))}
          </nav>
          <div className="header-tools">
            <div className="accent-switch" role="group" aria-label="Цветовой акцент">
              {accents.map(({ id, label }) => (
                <button key={id} type="button" className="accent-swatch" data-swatch={id} aria-label={label} aria-pressed={variant === id} title={label} onClick={() => switchVariant(id)} />
              ))}
            </div>
            <div className="profile-anchor" ref={profileRef}>
              <button type="button" className="icon-button profile-toggle" aria-label="Профиль" aria-expanded={profileOpen} aria-controls="profile-card" ref={profileButton} onClick={() => setProfileOpen((open) => !open)}>
                <UserRound aria-hidden="true" />
              </button>
              {profileOpen && (
                <section className="profile-card" id="profile-card" aria-label="Профиль">
                  <strong>Гость</strong>
                  <p>Избранное и плейлисты сохраняются в этом браузере.</p>
                  <a href={screenHref("library", variant)} onClick={(event) => navigate(event, "library")}>Моя медиатека</a>
                </section>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="app-main" data-screen={screen}>
        {screen === "home" && (
          <>
            <WavePlayer
              player={sharedPlayer}
              preferences={preferences}
              tuningNotice={tuningNotice}
              disliked={activeTrack ? dislikedIds.includes(activeTrack.id) : false}
              onDislike={dislike}
              onOpenQueue={() => queueDialog.current?.showModal()}
              onBrowse={() => scrollToSection(feedRef.current)}
              onTune={tune}
            />

            <section className="home-feed" id="home-feed" ref={feedRef} tabIndex={-1} aria-label="Подборки и треки">
              <div className="feed-filters" role="group" aria-label="Подборки">
                {filters.map(({ id, title, Icon }) => (
                  <button type="button" key={id} aria-pressed={!genre && collection === id} aria-controls="home-collection" onClick={() => selectFilter(id)}>
                    <Icon aria-hidden="true" /><span>{title}</span>
                  </button>
                ))}
              </div>

              <section className="home-discovery" aria-labelledby="discovery-heading">
                <h2 id="discovery-heading">Миксы и жанры</h2>
                <HomeDiscovery
                  tracks={tracks}
                  activeTrackId={activeTrack?.id}
                  playing={player.playing}
                  queue={player.queue}
                  selectedGenre={genre}
                  onSelectGenre={selectGenre}
                  onPlayMix={playTrack}
                  onTogglePlayback={togglePlayback}
                />
              </section>

              <section className="home-collection" id="home-collection" ref={listRef} tabIndex={-1} aria-labelledby="collection-heading">
                <header className="collection-header">
                  <h2 id="collection-heading">{genre ?? collectionTitles[collection]}</h2>
                  {canExpand ? (
                    <button type="button" className="text-action" aria-expanded={showAll} aria-controls="home-collection-tracks" onClick={() => setShowAll((expanded) => !expanded)}>
                      {showAll ? "Свернуть" : "Показать все"}
                    </button>
                  ) : showRecent && (
                    <a className="text-action" href={screenHref("library", variant)} onClick={(event) => navigate(event, "library")}>Показать все</a>
                  )}
                </header>
                {displayedTracks.length > 0
                  ? <TrackList id="home-collection-tracks" tracks={displayedTracks} queueTracks={collectionTracks} player={sharedPlayer} />
                  : <p className="panel-empty">{collection === "favorites" ? "Здесь появятся треки, которые вы отметили сердцем." : "В этой подборке пока нет треков."}</p>}
              </section>
            </section>
          </>
        )}

        {screen === "search" && <SearchScreen tracks={tracks} player={sharedPlayer} initialQuery={searchRequest.query} searchRevision={searchRequest.revision} />}
        {screen === "favorites" && <FavoritesScreen tracks={tracks} player={sharedPlayer} onSearchArtist={(artist) => goTo("search", artist)} onSearch={() => goTo("search")} />}
        {screen === "library" && <LibraryScreen recentTracks={recentTracks} tracks={tracks} player={sharedPlayer} onOpenFavorites={() => goTo("favorites")} />}
      </main>

      {player.error && <div className="player-error" role="status">{player.error}</div>}
      <MiniPlayer player={sharedPlayer} visible={screen !== "home" || belowFold} onOpenPlayer={openPlayer} onOpenQueue={() => queueDialog.current?.showModal()} />

      <dialog className="queue-dialog" ref={queueDialog} aria-labelledby="queue-title" onClick={(event) => {
        if (event.target === event.currentTarget) queueDialog.current?.close();
      }}>
        <div className="queue-content">
          <header className="collection-header">
            <h2 id="queue-title">Очередь</h2>
            <button className="icon-button" type="button" aria-label="Закрыть очередь" onClick={() => queueDialog.current?.close()}><X /></button>
          </header>
          {player.queue.length
            ? <TrackList tracks={player.queue} player={sharedPlayer} />
            : <p className="panel-empty">Включите трек, чтобы заполнить очередь.</p>}
        </div>
      </dialog>
    </div>
  );
}
