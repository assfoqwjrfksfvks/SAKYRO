import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { demoTracks, type DemoTrack } from "./catalog-data.ts";

const migrationFiles = ["001_catalog.sql"];
const demoSeed = "demo-catalog-v1";

let catalogDatabase: DatabaseSync | undefined;

function migrateAndSeed(database: DatabaseSync) {
  database.exec("BEGIN IMMEDIATE");

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS catalog_changes (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
    `);

    const applied = database.prepare("SELECT 1 FROM catalog_changes WHERE name = ?");
    const markApplied = database.prepare("INSERT INTO catalog_changes (name) VALUES (?)");

    for (const name of migrationFiles) {
      if (applied.get(name)) continue;

      const sql = readFileSync(join(process.cwd(), "db", "migrations", name), "utf8");
      database.exec(sql);
      markApplied.run(name);
    }

    if (!applied.get(demoSeed)) {
      const addArtist = database.prepare("INSERT INTO artists (id, name) VALUES (?, ?)");
      const addTrack = database.prepare(`
        INSERT INTO demo_tracks (id, artist_id, title, genre, duration, cover, audio, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const [position, track] of demoTracks.entries()) {
        const artistId = `demo-artist-${position + 1}`;
        addArtist.run(artistId, track.artist);
        addTrack.run(track.id, artistId, track.title, track.genre, track.duration, track.cover, track.audio, position);
      }

      markApplied.run(demoSeed);
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function openCatalog() {
  const dataDirectory = process.env.SAKYRO_DATA_DIR ?? join(process.cwd(), ".data");
  mkdirSync(dataDirectory, { recursive: true });

  const database = new DatabaseSync(join(dataDirectory, "catalog.sqlite"), {
    enableForeignKeyConstraints: true,
    timeout: 5_000,
  });

  try {
    migrateAndSeed(database);
    return database;
  } catch (error) {
    database.close();
    throw error;
  }
}

export function getCatalog(): DemoTrack[] {
  catalogDatabase ??= openCatalog();

  const tracks = catalogDatabase.prepare(`
    SELECT tracks.id, tracks.title, artists.name AS artist, tracks.genre,
           tracks.duration, tracks.cover, tracks.audio
    FROM demo_tracks AS tracks
    JOIN artists ON tracks.artist_id = artists.id
    ORDER BY tracks.position
  `).all() as DemoTrack[];

  // SQLite rows have a null prototype. Client components receive plain objects.
  return tracks.map((track) => ({ ...track }));
}
