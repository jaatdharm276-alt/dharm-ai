export const MAX_PARALLEL_SPECIALISTS = 3;
export const MAX_SPECIALIST_TASK_CHARS = 12_000;
export const MAX_SPECIALIST_FINDINGS_CHARS = 7_000;
export const DEFAULT_SPECIALIST_TIMEOUT_MS = 45_000;
const MAX_SPECIALIST_TIMEOUT_MS = 60_000;

const SUPPORTED_ROLES = new Set([
  "planner",
  "research_analyst",
  "coder",
  "security_reviewer",
  "verifier",
]);

const APPROVAL_REQUIRED_ACTIONS = new Set([
  "write_repository",
  "create_commit",
  "push_branch",
  "create_pull_request",
  "merge_pull_request",
  "deploy_production",
  "change_secret",
  "change_permissions",
  "delete_resource",
  "publish_external",
]);

export function getAgentActionPolicy(action) {
  const normalized = String(action || "").trim().toLowerCase();
  const requiresUserApproval = APPROVAL_REQUIRED_ACTIONS.has(normalized);
  return Object.freeze({
    action: normalized,
    allowedToPrepare: true,
    requiresUserApproval,
    mayExecuteAutomatically: !requiresUserApproval,
  });
}

function validateRun(roles, task, runner) {
  if (!Array.isArray(roles) || roles.length < 2 || roles.length > MAX_PARALLEL_SPECIALISTS) {
    throw new Error("Choose two or three specialists.");
  }
  if (new Set(roles).size !== roles.length) {
    throw new Error("Specialist roles must be unique.");
  }
  if (roles.some((role) => !SUPPORTED_ROLES.has(role))) {
    throw new Error("One or more specialist roles are not supported.");
  }
  if (typeof task !== "string" || !task.trim() || task.length > MAX_SPECIALIST_TASK_CHARS) {
    throw new Error("Specialist task must be non-empty and within the size limit.");
  }
  if (typeof runner !== "function") throw new TypeError("A specialist runner is required.");
}

async function runOneSpecialist(role, task, runner, parentSignal, timeoutMs) {
  if (parentSignal?.aborted) {
    return { role, status: "cancelled", error: "Specialist cancelled." };
  }

  const controller = new AbortController();
  let timer;
  let timedOut = false;
  let removeParentAbort = () => {};

  const outcome = await new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      removeParentAbort();
      resolve(value);
    };
    const onParentAbort = () => {
      controller.abort();
      finish({ type: "cancelled" });
    };

    if (parentSignal) {
      parentSignal.addEventListener("abort", onParentAbort, { once: true });
      removeParentAbort = () => parentSignal.removeEventListener("abort", onParentAbort);
    }

    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      finish({ type: "timed_out" });
    }, timeoutMs);

    Promise.resolve()
      .then(() => runner(role, task, { signal: controller.signal }))
      .then(
        (value) => finish({ type: "result", value }),
        (error) => finish({ type: "error", error }),
      );
  });

  if (outcome.type === "cancelled") {
    return { role, status: "cancelled", error: "Specialist cancelled." };
  }
  if (outcome.type === "timed_out" || timedOut) {
    return { role, status: "timed_out", error: "Specialist timed out." };
  }
  if (outcome.type === "error") {
    return outcome.error?.name === "AbortError"
      ? { role, status: "cancelled", error: "Specialist cancelled." }
      : { role, status: "failed", error: "Specialist analysis failed." };
  }

  const findings = String(outcome.value?.findings || "").slice(0, MAX_SPECIALIST_FINDINGS_CHARS);
  return findings
    ? { role, status: "completed", findings }
    : { role, status: "failed", error: "Specialist returned no findings." };
}

/**
 * Provider-neutral orchestration. The caller supplies the actual model adapter.
 * Workers are role-specialized tasks, not automatically separate vendor models.
 */
export async function runAgentTeam(roles, task, runner, options = {}) {
  validateRun(roles, task, runner);
  const timeoutMs = Number.isInteger(options.timeoutMs)
    ? Math.min(MAX_SPECIALIST_TIMEOUT_MS, Math.max(1_000, options.timeoutMs))
    : DEFAULT_SPECIALIST_TIMEOUT_MS;

  return Promise.all(roles.map((role) =>
    runOneSpecialist(role, task, runner, options.signal, timeoutMs),
  ));
}

/** Backwards-compatible wrapper used by the existing Agent route. */
export async function runSpecialistsInParallel(roles, task, runner, options = {}) {
  const results = await runAgentTeam(roles, task, runner, options);
  return results.map((item) => {
    if (item.status === "completed") return { role: item.role, findings: item.findings };
    return {
      role: item.role,
      error: item.status === "cancelled" ? "Specialist cancelled."
        : item.status === "timed_out" ? "Specialist timed out."
          : "Specialist analysis failed.",
    };
  });
}
