import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../public/manifest.json", import.meta.url), "utf8"));
const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
const layout = await readFile(new URL("../app/layout.js", import.meta.url), "utf8");
const page = await readFile(new URL("../app/page.js", import.meta.url), "utf8");

test("PWA manifest is standalone and has a scalable app icon", () => {
  assert.equal(manifest.name, "ORION AI");
  assert.equal(manifest.display, "standalone");
  assert.ok(manifest.icons.some((icon) => icon.src === "/orion-icon.svg" && icon.sizes === "any"));
});

test("PWA service worker never caches API responses", () => {
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /request\.method !== "GET"/);
});

test("application registers the service worker", () => {
  assert.match(layout, /PwaRegister/);
  assert.match(page, /extractSources\(message\.content\)/);
  assert.match(page, /Sources & references/);
});
