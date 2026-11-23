"use client";

import {
  AudioLines,
  Check,
  ChevronDown,
  Disc3,
  Headphones,
  Heart,
  History,
  ListMusic,
  ListPlus,
  Play,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Cover, TrackList } from "@/components/track-list";
import type { usePlayer } from "@/components/use-player";
import type { DemoTrack } from "@/lib/catalog-data";
import "@/app/browse-screens.css";

type Player = ReturnType<typeof usePlayer>;
type TrackScreen = { tracks: DemoTrack[]; player: Player };

function trackCount(count: number) {
  const lastTwo = count % 100;
  const lastDigit = count % 10;
  if (lastDigit === 1 && lastTwo !== 11) return `${count} трек`;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${count} трека`;
  return `${count} треков`;
}

function playAll(tracks: readonly DemoTrack[], player: Player) {
  if (tracks.length) player.playTrack(tracks[0].id, tracks.map(({ id }) => id));
}

function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="browse-empty">
      <span className="browse-empty__icon" aria-hidden="true">{icon}</span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

const categories = [
  { id: "moods", title: "Настроения", icon: AudioLines },
  { id: "genres", title: "Жанры", icon: Disc3 },
  { id: "focus", title: "Для фокуса", icon: Headphones },
  { id: "new", title: "Новинки", icon: Sparkles },
] as const;

const moods = [
  { title: "Спокойно", genres: ["Эмбиент", "Лоу-фай", "Инструментальная", "Даунтемпо"] },
  { title: "Энергично", genres: ["Поп", "Электроника"] },
  { title: "Ночной ритм", genres: ["Фонк", "Даунтемпо", "Лоу-фай"] },
];

type Category = (typeof categories)[number]["id"];
type SearchTag = { title: string; genres: string[] };

function normalize(value: string) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}

function showCategories(tracks: DemoTrack[], category: Category | null) {
  if (category === "focus") return tracks.filter(({ genre }) => moods[0].genres.includes(genre));
  if (category === "new") return tracks.slice(-4).reverse();
  return tracks;
}

function SearchContent({ tracks, player, initialQuery = "" }: TrackScreen & { initialQuery?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<Category | null>(null);
  const [tag, setTag] = useState<SearchTag | null>(null);
  const categoryTracks = showCategories(tracks, category);
  const availableGenres = [...new Set((category === "genres" ? tracks : categoryTracks).map(({ genre }) => genre))];
  const genreTags = availableGenres.map((genre) => ({ title: genre, genres: [genre] }));
  const commonGenres = genreTags.filter(({ title }) => ["Эмбиент", "Поп", "Фонк"].includes(title));
  const tags = category === "genres" ? genreTags : category === "moods" ? moods : [...commonGenres, ...moods];
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const results = categoryTracks.filter((track) => {
    if (tag && !tag.genres.includes(track.genre)) return false;
    const metadata = normalize(`${track.title} ${track.artist} ${track.genre}`);
    return words.every((word) => metadata.includes(word));
  });
  const resultHeading = words.length ? "Результаты поиска" : tag?.title
    ?? (category === "focus" ? "Для фокуса" : category === "new" ? "Новинки" : "Треки");

  function toggleCategory(next: Category) {
    setCategory(category === next ? null : next);
    setTag(null);
  }

  function clearSearch() {
    setQuery("");
    input.current?.focus();
  }

  return (
    <div className="browse-screen browse-search">
      <header className="browse-heading">
        <h1>Поиск</h1>
      </header>

      <div className="browse-search-field" role="search">
        <Search aria-hidden="true" />
        <input
          ref={input}
          type="search"
          aria-label="Трек, исполнитель или жанр"
          placeholder="Трек, исполнитель или жанр"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {!!query.length && (
          <button className="icon-button" type="button" aria-label="Очистить поиск" onClick={clearSearch}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className="browse-tags" aria-label="Жанры и настроения">
        {tags.map((filter) => (
          <li key={filter.title}>
            <button
              className="browse-tag"
              type="button"
              aria-pressed={tag?.title === filter.title}
              aria-controls="browse-search-results"
              onClick={() => setTag(tag?.title === filter.title ? null : filter)}
            >
              {filter.title}
            </button>
          </li>
        ))}
      </ul>

      <div className="browse-category-grid" role="group" aria-label="Подборки для поиска">
        {categories.map(({ id, title, icon: Icon }) => (
          <button
            key={id}
            className="browse-category"
            type="button"
            data-category={id}
            aria-pressed={category === id}
            aria-controls="browse-search-results"
            onClick={() => toggleCategory(id)}
          >
            <Icon aria-hidden="true" />
            <span>{title}</span>
          </button>
        ))}
      </div>

      <section className="browse-section" id="browse-search-results" aria-labelledby="browse-search-heading">
        <header className="browse-section-heading">
          <h2 id="browse-search-heading">{resultHeading}</h2>
          <span role="status">{trackCount(results.length)}</span>
        </header>
        {results.length ? <TrackList tracks={results} player={player} /> : (
          <EmptyState icon={<Search />} title="Треки не найдены">
            <p>Попробуйте изменить запрос или сбросить фильтры.</p>
            <button className="browse-button browse-button--quiet" type="button" onClick={() => { setTag(null); setCategory(null); clearSearch(); }}>
              Сбросить поиск
            </button>
          </EmptyState>
        )}
      </section>
    </div>
  );
}

export function SearchScreen({ searchRevision, ...props }: TrackScreen & { initialQuery?: string; searchRevision?: number }) {
  return <SearchContent key={`${searchRevision ?? 0}:${props.initialQuery ?? ""}`} {...props} />;
}

export function FavoritesScreen({ tracks, player, onSearchArtist, onSearch }: TrackScreen & {
  onSearchArtist: (artist: string) => void;
  onSearch: () => void;
}) {
  const liked = new Set(player.favorites);
  const favoriteTracks = tracks.filter(({ id }) => liked.has(id));
  const artistTracks = new Map<string, DemoTrack>();
  for (const track of favoriteTracks) {
    if (!artistTracks.has(track.artist)) artistTracks.set(track.artist, track);
  }

  return (
    <div className="browse-screen browse-favorites">
      <header className="browse-heading browse-heading--favorites">
        <span className="browse-heading__icon" aria-hidden="true"><Heart /></span>
        <div>
          <h1>Любимые треки</h1>
          <p role="status">{trackCount(favoriteTracks.length)}</p>
        </div>
        <button
          className="browse-button browse-button--primary"
          type="button"
          disabled={!favoriteTracks.length}
          onClick={() => playAll(favoriteTracks, player)}
        >
          <Play aria-hidden="true" /> Слушать всё
        </button>
      </header>

      {favoriteTracks.length ? (
        <>
          <TrackList tracks={favoriteTracks} player={player} />
          <section className="browse-section" aria-labelledby="browse-favorite-artists">
            <header className="browse-section-heading">
              <h2 id="browse-favorite-artists">Любимые исполнители</h2>
            </header>
            <ul className="browse-artists">
              {Array.from(artistTracks, ([artist, track]) => (
                <li key={artist}>
                  <button type="button" onClick={() => onSearchArtist(artist)} aria-label={`Найти треки исполнителя: ${artist}`}>
                    <Cover track={track} size={86} />
                    <span>{artist}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <EmptyState icon={<Heart />} title="Здесь будут любимые треки">
          <p>Нажмите на сердце рядом с треком, чтобы сохранить его.</p>
          <button className="browse-button browse-button--quiet" type="button" onClick={onSearch}>Найти музыку</button>
        </EmptyState>
      )}
    </div>
  );
}

type Playlist = { id: string; name: string; trackIds: string[] };

const playlistStorageKey = "sakyro.playlists.v1";
const playlistChangeEvent = "sakyro:playlists-change";
let memoryPlaylists: string | undefined;

function playlistSnapshot() {
  if (memoryPlaylists !== undefined) return memoryPlaylists;
  try {
    return window.localStorage.getItem(playlistStorageKey) ?? "";
  } catch {
    return "";
  }
}

function serverPlaylistSnapshot() {
  return "";
}

function subscribeToPlaylists(notify: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === playlistStorageKey || event.key === null) notify();
  }

  window.addEventListener("storage", onStorage);
  window.addEventListener(playlistChangeEvent, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(playlistChangeEvent, notify);
  };
}

function readPlaylists(json: string): Playlist[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return [];
    return value.filter((playlist): playlist is Playlist => playlist !== null && typeof playlist === "object"
      && typeof playlist.id === "string" && typeof playlist.name === "string"
      && Array.isArray(playlist.trackIds) && playlist.trackIds.every((id: unknown) => typeof id === "string"));
  } catch {
    return [];
  }
}

function storePlaylist(playlist: Playlist) {
  const next = JSON.stringify([playlist, ...readPlaylists(playlistSnapshot())]);
  try {
    window.localStorage.setItem(playlistStorageKey, next);
    memoryPlaylists = undefined;
  } catch {
    memoryPlaylists = next;
  }
  window.dispatchEvent(new Event(playlistChangeEvent));
}

function focusSection(section: HTMLElement | null) {
  if (!section) return;
  section.focus({ preventScroll: true });
  section.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

export function LibraryScreen({ recentTracks, tracks, player, onOpenFavorites }: TrackScreen & {
  recentTracks: DemoTrack[];
  onOpenFavorites: () => void;
}) {
  const recent = useRef<HTMLElement>(null);
  const playlistsSection = useRef<HTMLElement>(null);
  const editor = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openPlaylist, setOpenPlaylist] = useState<string | null>(null);
  const storedPlaylists = useSyncExternalStore(subscribeToPlaylists, playlistSnapshot, serverPlaylistSnapshot);
  const playlists = readPlaylists(storedPlaylists);
  const byId = new Map(tracks.map((track) => [track.id, track]));
  const favoriteCount = player.favorites.filter((id) => byId.has(id)).length;

  function openEditor() {
    setName("");
    setSelectedIds([]);
    editor.current?.showModal();
    nameInput.current?.focus();
  }

  function toggleTrack(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function createPlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = name.trim();
    const trackIds = selectedIds.filter((id) => byId.has(id));
    if (!title || !trackIds.length) return;

    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    storePlaylist({ id, name: title, trackIds });
    setOpenPlaylist(id);
    editor.current?.close();
    window.requestAnimationFrame(() => focusSection(playlistsSection.current));
  }

  return (
    <div className="browse-screen browse-library">
      <header className="browse-heading">
        <h1>Медиатека</h1>
      </header>
      <div className="browse-library-grid" role="group" aria-label="Разделы медиатеки">
        <button className="browse-library-tile" type="button" onClick={onOpenFavorites}>
          <span className="browse-library-tile__icon" aria-hidden="true"><Heart /></span>
          <span className="browse-library-tile__copy"><strong>Любимые треки</strong><span>{trackCount(favoriteCount)}</span></span>
        </button>
        <button className="browse-library-tile" type="button" aria-controls="browse-library-history" onClick={() => focusSection(recent.current)}>
          <span className="browse-library-tile__icon" aria-hidden="true"><History /></span>
          <span className="browse-library-tile__copy"><strong>Недавние треки</strong><span>{trackCount(recentTracks.length)}</span></span>
        </button>
        <button className="browse-library-tile browse-library-tile--create" type="button" aria-haspopup="dialog" disabled={!tracks.length} onClick={openEditor}>
          <span className="browse-library-tile__icon" aria-hidden="true"><ListPlus /></span>
          <span className="browse-library-tile__copy"><strong>Создать плейлист</strong></span>
        </button>
      </div>

      <section className="browse-section" id="browse-library-history" ref={recent} tabIndex={-1} aria-labelledby="browse-library-recent">
        <header className="browse-section-heading"><h2 id="browse-library-recent">Недавние треки</h2></header>
        {recentTracks.length ? <TrackList tracks={recentTracks} player={player} /> : (
          <div className="browse-library-empty"><History aria-hidden="true" /> <p>Тут появятся треки, которые вы слушали.</p></div>
        )}
      </section>

      {playlists.length > 0 && (
        <section className="browse-section" ref={playlistsSection} tabIndex={-1} aria-labelledby="browse-library-playlists">
          <header className="browse-section-heading"><h2 id="browse-library-playlists">Плейлисты</h2></header>
          <div className="browse-playlists">
            {playlists.map((playlist) => {
              const playlistTracks = playlist.trackIds.flatMap((id) => {
                const track = byId.get(id);
                return track ? [track] : [];
              });
              const expanded = openPlaylist === playlist.id;
              const panelId = `playlist-${playlist.id}`;
              return (
                <article key={playlist.id} className="browse-playlist">
                  <div className="browse-playlist__header">
                    <button
                      className="browse-playlist__toggle"
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={panelId}
                      onClick={() => setOpenPlaylist(expanded ? null : playlist.id)}
                    >
                      <span className="browse-library-tile__icon" aria-hidden="true"><ListMusic /></span>
                      <span className="browse-library-tile__copy"><strong>{playlist.name}</strong><span>{trackCount(playlistTracks.length)}</span></span>
                      <ChevronDown aria-hidden="true" />
                    </button>
                    <button className="icon-button browse-playlist__play" type="button" aria-label={`Слушать плейлист: ${playlist.name}`} disabled={!playlistTracks.length} onClick={() => playAll(playlistTracks, player)}>
                      <Play aria-hidden="true" />
                    </button>
                  </div>
                  <div className="browse-playlist__tracks" id={panelId} hidden={!expanded}>
                    {expanded && (playlistTracks.length ? <TrackList tracks={playlistTracks} player={player} /> : <p>В плейлисте пока нет доступных треков.</p>)}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <dialog ref={editor} className="browse-playlist-editor" aria-labelledby="browse-playlist-title" onClick={(event) => { if (event.target === event.currentTarget) editor.current?.close(); }}>
        <form onSubmit={createPlaylist}>
          <header>
            <h2 id="browse-playlist-title">Новый плейлист</h2>
            <button className="icon-button" type="button" aria-label="Закрыть" onClick={() => editor.current?.close()}><X aria-hidden="true" /></button>
          </header>
          <label className="browse-playlist-editor__name">
            <span>Название</span>
            <input ref={nameInput} type="text" maxLength={64} required value={name} onChange={(event) => setName(event.currentTarget.value)} />
          </label>
          <fieldset>
            <legend>Треки</legend>
            <div className="browse-playlist-options">
              {tracks.map((track) => (
                <label className="browse-playlist-option" key={track.id}>
                  <input type="checkbox" checked={selectedIds.includes(track.id)} onChange={() => toggleTrack(track.id)} />
                  <span className="browse-playlist-option__check" aria-hidden="true"><Check /></span>
                  <Cover track={track} size={38} />
                  <span className="track-copy"><span className="track-title">{track.title}</span><span className="track-artist">{track.artist}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          <footer className="browse-playlist-editor__actions">
            <span role="status">{trackCount(selectedIds.length)}</span>
            <button className="browse-button browse-button--primary" type="submit" disabled={!name.trim() || !selectedIds.length}>Создать</button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
