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

function createRoleSignal(parentSignal, timeoutMs) {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  return parentSignal ? AbortSignal.any([parentSignal, timeoutSignal]) : timeoutSignal;
}

function waitForAbortOrTimeout(signal, timeoutMs) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      const error = new Error("Specialist timed out.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);
    const onAbort = () => {
      clearTimeout(timer);
      const error = new Error("Specialist cancelled.");
      error.name = "AbortError";
      reject(error);
    };
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  });
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
  const parentSignal = options.signal;

  return Promise.all(roles.map(async (role) => {
    if (parentSignal?.aborted) {
      return { role, status: "cancelled", error: "Specialist cancelled." };
    }

    const signal = createRoleSignal(parentSignal, timeoutMs);
    try {
      const result = await Promise.race([
        Promise.resolve().then(() => runner(role, task, { signal })),
        waitForAbortOrTimeout(signal, timeoutMs),
      ]);
      const findings = String(result?.findings || "").slice(0, MAX_SPECIALIST_FINDINGS_CHARS);
      return findings
        ? { role, status: "completed", findings }
        : { role, status: "failed", error: "Specialist returned no findings." };
    } catch (error) {
      if (parentSignal?.aborted || error?.name === "AbortError") {
        return { role, status: "cancelled", error: "Specialist cancelled." };
      }
      if (error?.name === "TimeoutError" || signal.aborted) {
        return { role, status: "timed_out", error: "Specialist timed out." };
      }
      return { role, status: "failed", error: "Specialist analysis failed." };
    }
  }));
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
