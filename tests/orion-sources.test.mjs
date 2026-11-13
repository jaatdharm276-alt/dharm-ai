import test from "node:test";
import assert from "node:assert/strict";
import { extractSources } from "../lib/orion-sources.mjs";

test("extracts unique HTTP(S) markdown sources with readable domains", () => {
  const sources = extractSources(
    "See [Official report](https://www.example.com/report#summary) and [More](https://news.example.org/story). Repeat [same](https://www.example.com/report)."
  );
  assert.equal(sources.length, 2);
  assert.deepEqual(sources[0], {
    title: "Official report",
    domain: "example.com",
    url: "https://www.example.com/report",
  });
});

test("ignores unsafe and malformed links", () => {
  assert.deepEqual(
    extractSources("[bad](javascript:alert(1)) [also bad](ftp://example.com/file)"),
    []
  );
});

test("respects the source display limit", () => {
  const links = Array.from({ length: 8 }, (_, i) => `[Source ${i}](https://site${i}.example/path)`).join(" ");
  assert.equal(extractSources(links, 3).length, 3);
});
