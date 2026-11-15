import test from "node:test";
import assert from "node:assert/strict";
import {
  getHanumanChalisaCounts,
  getHanumanChalisaResponse,
  isHanumanChalisaRequest,
} from "./orion-hanuman-chalisa.mjs";

test("recognizes Hindi and English Hanuman Chalisa requests", () => {
  assert.equal(isHanumanChalisaRequest("हनुमान चालीसा सुनाओ"), true);
  assert.equal(isHanumanChalisaRequest("Please share Hanuman Chalisa"), true);
  assert.equal(isHanumanChalisaRequest("हनुमान जी का मंत्र बताओ"), false);
});

test("returns exactly two opening dohas, forty numbered chaupais and one closing doha", () => {
  const counts = getHanumanChalisaCounts();
  const answer = getHanumanChalisaResponse("पूरी हनुमान चालीसा लिखो");
  assert.deepEqual(counts, { openingDohas: 2, chaupais: 40, closingDohas: 1 });
  assert.match(answer, /॥ दोहा ॥/);
  assert.match(answer, /॥ चौपाई ॥/);
  assert.match(answer, /॥ समापन दोहा ॥/);
  for (let verse = 1; verse <= 40; verse += 1) {
    assert.ok(answer.includes(`॥${verse}॥`), `missing chaupai ${verse}`);
  }
  assert.equal((answer.match(/॥(?:[1-9]|[1-3][0-9]|40)॥/g) || []).length, 40);
  assert.ok(answer.includes("तुलसीदास सदा हरि चेरा।\nकीजै नाथ हृदय महँ डेरा॥"));
  assert.ok(answer.includes("पवनतनय संकट हरन मंगल मूरति रूप।\nराम लखन सीता सहित हृदय बसहु सुर भूप॥"));
});

test("does not return a fixed response for unrelated messages", () => {
  assert.equal(getHanumanChalisaResponse("आज का मौसम बताओ"), null);
});
