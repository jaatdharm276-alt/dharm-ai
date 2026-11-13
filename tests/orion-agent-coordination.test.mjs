import test from "node:test";
import assert from "node:assert/strict";
import { runSpecialistsInParallel, MAX_PARALLEL_SPECIALISTS } from "../lib/orion-agent-coordination.mjs";

test("runs distinct specialists concurrently and preserves requested result order", async () => {
  const started = [];
  const results = await runSpecialistsInParallel(["coder", "security_reviewer", "verifier"], "Review the change", async (role) => {
    started.push(role);
    await new Promise((resolve) => setTimeout(resolve, role === "coder" ? 15 : 1));
    return { findings: role + " result" };
  });
  assert.deepEqual(started.sort(), ["coder", "security_reviewer", "verifier"]);
  assert.deepEqual(results.map((item) => item.role), ["coder", "security_reviewer", "verifier"]);
  assert.equal(results.every((item) => item.findings.endsWith("result")), true);
});

test("isolates an individual specialist failure", async () => {
  const results = await runSpecialistsInParallel(["coder", "verifier"], "Check", async (role) => {
    if (role === "coder") throw new Error("provider detail must not leak");
    return { findings: "verified" };
  });
  assert.deepEqual(results, [
    { role: "coder", error: "Specialist analysis failed." },
    { role: "verifier", findings: "verified" },
  ]);
});

test("reports cancellation without failing other specialists", async () => {
  const results = await runSpecialistsInParallel(["planner", "verifier"], "Plan", async (role) => {
    if (role === "planner") throw Object.assign(new Error("cancelled"), { name: "AbortError" });
    return { findings: "done" };
  });
  assert.deepEqual(results[0], { role: "planner", error: "Specialist cancelled." });
  assert.deepEqual(results[1], { role: "verifier", findings: "done" });
});

test("rejects too few, too many, or duplicate specialists", async () => {
  assert.equal(MAX_PARALLEL_SPECIALISTS, 3);
  await assert.rejects(runSpecialistsInParallel(["coder"], "Task", async () => ({})), /two or three/);
  await assert.rejects(runSpecialistsInParallel(["a", "b", "c", "d"], "Task", async () => ({})), /two or three/);
  await assert.rejects(runSpecialistsInParallel(["coder", "coder"], "Task", async () => ({})), /unique/);
});
