import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
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
