import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { demoTracks, type DemoTrack } from "../src/lib/catalog-data.ts";

const project = new URL("../", import.meta.url);

function readCatalog(dataDirectory: string): [DemoTrack[], DemoTrack[]] {
  const output = execFileSync(process.execPath, [
    "--disable-warning=ExperimentalWarning",
    "--input-type=module",
    "--eval",
    'import { getCatalog } from "./src/lib/catalog.ts"; console.log(JSON.stringify([getCatalog(), getCatalog()]));',
  ], {
    cwd: project,
    env: { ...process.env, SAKYRO_DATA_DIR: dataDirectory },
    encoding: "utf8",
  });

  return JSON.parse(output);
}

test("migrates and seeds the catalog once with local media files", (context) => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "sakyro-catalog-"));
  context.after(() => rmSync(dataDirectory, { recursive: true, force: true }));

  const [first, repeated] = readCatalog(dataDirectory);
  assert.ok(first.length > 0);
  assert.deepEqual(first, demoTracks);
  assert.deepEqual(repeated, first);

  for (const { audio, cover } of first) {
    assert.match(audio, /^\/audio\/[a-z0-9._-]+\.mp3$/);
    assert.match(cover, /^\/images\/[a-z0-9._-]+\.webp$/);

    for (const path of [audio, cover]) {
      const asset = statSync(new URL(`public${path}`, project));
      assert.ok(asset.isFile() && asset.size > 0, path);
    }
  }

  const title = "Название, сохранённое между запусками";
  const database = new DatabaseSync(join(dataDirectory, "catalog.sqlite"));
  try {
    database.prepare("UPDATE demo_tracks SET title = ? WHERE id = ?").run(title, first[0].id);
  } finally {
    database.close();
  }

  const expected = [{ ...first[0], title }, ...first.slice(1)];
  assert.deepEqual(readCatalog(dataDirectory), [expected, expected]);
});

test("adds genre tracks to a v1 database and preserves existing edits", (context) => {
  const dataDirectory = mkdtempSync(join(tmpdir(), "sakyro-catalog-upgrade-"));
  context.after(() => rmSync(dataDirectory, { recursive: true, force: true }));
  const database = new DatabaseSync(join(dataDirectory, "catalog.sqlite"));
  const legacyTracks = demoTracks.slice(0, 6);
  const title = "Название из прежней базы";
  const artist = "Исполнитель из прежней базы";

  try {
    database.exec(readFileSync(new URL("db/migrations/001_catalog.sql", project), "utf8"));
    database.exec(`
      CREATE TABLE catalog_changes (
        name TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) STRICT;
      INSERT INTO catalog_changes (name) VALUES ('001_catalog.sql'), ('demo-catalog-v1');
    `);
    const addArtist = database.prepare("INSERT INTO artists (id, name) VALUES (?, ?)");
    const addTrack = database.prepare(`
      INSERT INTO demo_tracks (id, artist_id, title, genre, duration, cover, audio, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `);

    for (const [index, track] of legacyTracks.entries()) {
      const artistId = `demo-artist-${index + 1}`;
      addArtist.run(artistId, index === 0 ? artist : track.artist);
      addTrack.run(track.id, artistId, index === 0 ? title : track.title, track.genre,
        track.duration, track.cover, track.audio, index * 2);
    }
  } finally {
    database.close();
  }

  const [first, repeated] = readCatalog(dataDirectory);
  assert.equal(first.length, 8);
  assert.deepEqual(first[0], { ...legacyTracks[0], title, artist });
  assert.deepEqual(first.slice(1, 6), legacyTracks.slice(1));
  assert.deepEqual(first.slice(6).map(({ id, genre }) => [id, genre]), [
    ["city-lights", "Поп"],
    ["after-midnight", "Фонк"],
  ]);
  assert.deepEqual(repeated, first);
  assert.deepEqual(readCatalog(dataDirectory), [first, first]);
});
