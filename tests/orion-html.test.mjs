import test from "node:test";
import assert from "node:assert/strict";
import { escapeHtml } from "../lib/orion-html.mjs";

test("escapes HTML text and quotes used inside generated link attributes", () => {
  assert.equal(
    escapeHtml('<img src=x onerror="alert(1)"> and \'quoted\''),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; and &#39;quoted&#39;"
  );
});

test("escapes ampersands before other HTML characters", () => {
  assert.equal(escapeHtml("a&b<c"), "a&amp;b&lt;c");
});
