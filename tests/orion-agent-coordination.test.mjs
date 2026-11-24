import test from "node:test";
import assert from "node:assert/strict";
import {
  runAgentTeam,
  runSpecialistsInParallel,
  getAgentActionPolicy,
  MAX_PARALLEL_SPECIALISTS,
} from "../lib/orion-agent-coordination.mjs";

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
  const controller = new AbortController();
  controller.abort();
  const results = await runAgentTeam(["planner", "verifier"], "Plan", async () => ({ findings: "done" }), { signal: controller.signal });
  assert.deepEqual(results, [
    { role: "planner", status: "cancelled", error: "Specialist cancelled." },
    { role: "verifier", status: "cancelled", error: "Specialist cancelled." },
  ]);
});

test("rejects unsupported roles, empty tasks, and too many specialists", async () => {
  assert.equal(MAX_PARALLEL_SPECIALISTS, 3);
  await assert.rejects(runAgentTeam(["coder"], "Task", async () => ({})), /two or three/);
  await assert.rejects(runAgentTeam(["a", "b", "c", "d"], "Task", async () => ({})), /two or three/);
  await assert.rejects(runAgentTeam(["coder", "coder"], "Task", async () => ({})), /unique/);
  await assert.rejects(runAgentTeam(["coder", "verifier"], " ", async () => ({})), /non-empty/);
  await assert.rejects(runAgentTeam(["coder", "not_a_role"], "Task", async () => ({})), /not supported/);
});

test("bounds specialist execution even when a runner ignores cancellation", async () => {
  const startedAt = Date.now();
  const results = await runAgentTeam(
    ["coder", "verifier"],
    "Check",
    async () => new Promise(() => {}),
    { timeoutMs: 1_000 },
  );
  assert.ok(Date.now() - startedAt < 2_500);
  assert.deepEqual(results.map((item) => item.status), ["timed_out", "timed_out"]);
});

test("limits findings size and reports empty specialist output", async () => {
  const results = await runAgentTeam(["coder", "verifier"], "Check", async (role) => ({
    findings: role === "coder" ? "x".repeat(8_000) : "",
  }));
  assert.equal(results[0].findings.length, 7_000);
  assert.deepEqual(results[1], { role: "verifier", status: "failed", error: "Specialist returned no findings." });
});

test("repository writes and deployments require user approval", () => {
  assert.equal(getAgentActionPolicy("write_repository").requiresUserApproval, true);
  assert.equal(getAgentActionPolicy("merge_pull_request").mayExecuteAutomatically, false);
  assert.equal(getAgentActionPolicy("deploy_production").requiresUserApproval, true);
  assert.equal(getAgentActionPolicy("read_repository").mayExecuteAutomatically, true);
});
