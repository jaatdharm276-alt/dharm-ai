const MAX_TEXT_CHARS = 50_000;
const MAX_SEARCH_QUERY_CHARS = 500;
const MAX_SPECIALIST_TASK_CHARS = 5_000;
const SPECIALIST_ROLES = new Set(["planner", "research_analyst", "coder", "security_reviewer", "verifier"]);
const TOOL_FIELDS = {
  get_india_datetime: [],
  calculate: ["expression"],
  convert_units: ["value", "from", "to"],
  analyze_text: ["text"],
  search_web: ["query"],
  delegate_specialist: ["role", "task"],
  coordinate_specialists: ["roles", "task"],
};

function requireObject(args) {
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    throw new TypeError("Tool arguments must be a JSON object.");
  }
  return args;
}

function requireString(value, name, maxLength, { trim = true } = {}) {
  if (typeof value !== "string") throw new TypeError(name + " must be a string.");
  const result = trim ? value.trim() : value;
  if (!result) throw new TypeError(name + " cannot be empty.");
  if (result.length > maxLength) throw new RangeError(name + " exceeds the " + maxLength + " character limit.");
  return result;
}

/** Validate model-produced arguments again at the execution boundary. */
export function validateAgentToolArgs(name, rawArgs) {
  const args = requireObject(rawArgs);
  const allowed = TOOL_FIELDS[name];
  if (!allowed) throw new Error("Tool is not available.");
  const unknown = Object.keys(args).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new TypeError("Unexpected tool argument: " + unknown[0] + ".");

  switch (name) {
    case "get_india_datetime":
      return {};
    case "calculate":
      return { expression: requireString(args.expression, "expression", 160) };
    case "convert_units":
      if (typeof args.value !== "number" || !Number.isFinite(args.value)) throw new TypeError("value must be a finite number.");
      return {
        value: args.value,
        from: requireString(args.from, "from unit", 24),
        to: requireString(args.to, "to unit", 24),
      };
    case "analyze_text":
      return { text: requireString(args.text, "text", MAX_TEXT_CHARS, { trim: false }) };
    case "search_web":
      return { query: requireString(args.query, "search query", MAX_SEARCH_QUERY_CHARS) };
    case "delegate_specialist": {
      const role = requireString(args.role, "specialist role", 40);
      if (!SPECIALIST_ROLES.has(role)) throw new TypeError("Unsupported specialist role.");
      return { role, task: requireString(args.task, "specialist task", MAX_SPECIALIST_TASK_CHARS) };
    }
    case "coordinate_specialists": {
      const roles = args.roles;
      if (!Array.isArray(roles) || roles.length < 2 || roles.length > 3 || new Set(roles).size !== roles.length || roles.some((role) => typeof role !== "string" || !SPECIALIST_ROLES.has(role))) {
        throw new TypeError("Choose two or three distinct supported specialist roles.");
      }
      return { roles: [...roles], task: requireString(args.task, "specialist task", MAX_SPECIALIST_TASK_CHARS) };
    }
    default:
      throw new Error("Tool is not available.");
  }
}

export function summarizeToolResult(result, maxChars = 9000) {
  if (!Number.isInteger(maxChars) || maxChars < 100) throw new TypeError("maxChars must be an integer of at least 100.");
  let serialized;
  try {
    serialized = JSON.stringify(result);
  } catch {
    serialized = JSON.stringify({ error: "Tool returned a non-serializable result." });
  }
  if (typeof serialized !== "string") serialized = "null";
  if (serialized.length <= maxChars) return serialized;
  const envelope = (preview) => JSON.stringify({
    truncated: true,
    originalCharacters: serialized.length,
    preview,
    note: "Output truncated.",
  });
  // JSON escaping can expand quotes, backslashes, and control characters.
  // Find the longest preview whose final serialized envelope stays in budget.
  let low = 0;
  let high = Math.min(serialized.length, maxChars);
  let best = envelope("");
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = envelope(serialized.slice(0, middle));
    if (candidate.length <= maxChars) {
      best = candidate;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return best;
}
