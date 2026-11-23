CREATE TABLE artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
) STRICT;

CREATE TABLE demo_tracks (
    id TEXT PRIMARY KEY,
    artist_id TEXT NOT NULL REFERENCES artists (id),
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    cover TEXT NOT NULL,
    audio TEXT NOT NULL,
    position INTEGER NOT NULL UNIQUE CHECK (position >= 0)
) STRICT;

CREATE INDEX demo_tracks_artist_id ON demo_tracks (artist_id);
