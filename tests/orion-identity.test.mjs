import test from "node:test";
import assert from "node:assert/strict";
import { getCreatorAnswer } from "../lib/orion-identity.mjs";

test("answers the common Hindi transliteration creator question", () => {
  const answer = getCreatorAnswer("तुम्हें किसने बनाया");
  assert.match(answer, /Dharm AI/);
  assert.match(answer, /Dharmraj Jat/);
});

test("answers Roman Hindi variants", () => {
  assert.match(getCreatorAnswer("tumhe kisne banaya"), /Dharmraj Jat/);
  assert.match(getCreatorAnswer("tumhe kisne develop kiya"), /Dharmraj Jat/);
  assert.match(getCreatorAnswer("kisne banaya"), /Dharmraj Jat/);
});

test("answers English creator questions", () => {
  assert.match(getCreatorAnswer("Who created ORION AI?"), /Dharmraj Jat/);
  assert.match(getCreatorAnswer("Who made you?"), /Dharmraj Jat/);
});

test("distinguishes Dharm AI project question", () => {
  const answer = getCreatorAnswer("Dharm AI ko kisne banaya?");
  assert.match(answer, /Dharm AI को Dharmraj Jat/);
});

test("does not intercept unrelated questions", () => {
  assert.equal(getCreatorAnswer("Mujhe Jaipur ka rasta batao"), null);
  assert.equal(getCreatorAnswer("2 plus 2 kitna hota hai"), null);
});
