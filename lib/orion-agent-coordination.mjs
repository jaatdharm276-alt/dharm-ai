export const MAX_PARALLEL_SPECIALISTS = 3;

export async function runSpecialistsInParallel(roles, task, runner) {
  if (!Array.isArray(roles) || roles.length < 2 || roles.length > MAX_PARALLEL_SPECIALISTS) {
    throw new Error("Choose two or three specialists.");
  }
  if (new Set(roles).size !== roles.length) {
    throw new Error("Specialist roles must be unique.");
  }
  if (typeof runner !== "function") throw new TypeError("A specialist runner is required.");

  return Promise.all(roles.map(async (role) => {
    try {
      const result = await runner(role, task);
      return { role, findings: String(result?.findings || "").slice(0, 7000) };
    } catch (error) {
      return {
        role,
        error: error?.name === "AbortError" ? "Specialist cancelled." : "Specialist analysis failed.",
      };
    }
  }));
}
