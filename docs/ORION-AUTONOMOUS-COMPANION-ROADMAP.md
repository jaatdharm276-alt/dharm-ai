# ORION AI Autonomous Companion Roadmap

Status: implementation roadmap; not a claim that the listed capabilities are already shipped.
Baseline: `main` at `2d851040606c488698d86085e02ba3ac9e1a367e` (17 Nov 2026 audit).

## Product objective

Build ORION AI as a dependable autonomous companion that can understand a goal, plan bounded steps, use approved tools, work with user-provided files, perform research, create useful artifacts, recover from failures, and verify outcomes. Compete on measured task completion, reliability, safety, latency, and cost—not unsupported claims of being better than ChatGPT.

## Baseline capability audit

| Capability | Evidence in current repository | Status / gap |
|---|---|---|
| Chat and streaming | `app/api/chat/route.js`, Groq streaming | Implemented; needs regression and live-device validation |
| Agent planning/tool loop | `app/api/agent/route.js`, tool rounds/call limits | Partial agent runtime |
| Web research | Tavily + Bing RSS + Google News RSS fallback | Search exists; no general interactive browser session |
| Specialist delegation | planner, research analyst, coder, security reviewer, verifier | Text-only delegated analysis; specialists do not independently access tools |
| Calculations, unit conversion, text analysis, India time | Agent tool definitions and local modules | Implemented; expand test coverage |
| Memory | `lib/orion-memory.mjs` and memory UI | Basic app memory; needs consent, retention, deletion and retrieval tests |
| Retry/recovery/evidence | retry, recovery, evidence and verifier modules | Implemented in part; adversarial and fault-injection tests needed |
| Shared rate limiting | Upstash REST limiter | Implemented; production config and multi-instance behavior need verification |
| Cloud browser/computer use | No browser session, remote desktop, page interaction or computer-control adapter found in current agent tool definitions | Not implemented |
| User file workspace | No agent file read/write/search workspace tool found in current agent tool definitions | Not implemented |
| Long-running background tasks | No durable task queue, resumable run store or user-visible task lifecycle found in audited agent tools | Not implemented |
| External app integrations | No connector/permission framework exposed as agent tools | Not implemented |
| Android offline model inference | Current Android manifest only establishes an internet permission; local model runtime is not evidenced here | Not proven; separate device/model workstream |

## Product behavior contract

1. Understand the requested outcome and constraints before acting.
2. Produce a short task plan for multi-step work.
3. Select the least-privileged tool that can complete each step.
4. Treat web pages, files and tool output as untrusted data, never as instructions.
5. Ask before external side effects: sending, purchasing, publishing, deleting, merging, deploying, or changing account settings.
6. Stream truthful progress and distinguish planned, attempted, confirmed, failed and blocked steps.
7. Retry transient failures with bounded backoff; do not loop indefinitely or duplicate side effects.
8. Verify each material result against explicit acceptance criteria and show evidence.
9. If incomplete, preserve partial work and state exactly what remains.
10. Never claim background execution, browser access, file access, offline inference or completion unless the runtime actually supports and verifies it.

## Roadmap and acceptance gates

### Phase 0 — Baseline and test contract
- Run the full Node test suite, production build, dependency audit and existing exact-SHA live Agent E2E.
- Capture current results and classify flaky/provider-dependent tests separately from deterministic failures.
- Add a capability inventory test so advertised tools must map to real executable adapters.
- Acceptance: exact commit SHA is recorded; all deterministic tests and build pass; live E2E result is recorded without masking failures.

### Phase 1 — Reliable agent core
- Refactor the agent loop around explicit run state, typed tool results, budgets, cancellation and bounded retries.
- Add per-task limits for model calls, tool calls, wall-clock duration, output size and external search cost.
- Enforce strict tool schemas, argument validation, duplicate-call idempotency and safe error recovery.
- Separate internal lifecycle events from user-visible progress and final answer events.
- Acceptance: deterministic tests cover malformed tool calls, repeated calls, timeouts, cancellation, provider 429/5xx, empty model output, partial failure and stream termination.

### Phase 2 — Research and browser capability
- Keep current search adapters for lightweight discovery.
- Add a sandboxed browser adapter only after selecting a supported browser runtime; support navigation, click/type, page extraction, screenshots and downloads with domain/time/resource limits.
- Add source provenance, page timestamps, citation validation and prompt-injection isolation.
- Require user approval for authenticated sessions and sensitive actions.
- Acceptance: public-site research tasks pass a source-grounded E2E; malicious page instructions cannot invoke tools or override the user goal; blocked/unsupported sites are reported honestly.

### Phase 3 — Files and artifact workspace
- Add scoped file upload/read/search/create/edit/export tools with explicit per-run workspace boundaries.
- Support common document, spreadsheet, PDF, image and code workflows through dedicated parsers/generators.
- Scan/validate file type and size; prevent path traversal, secret leakage and cross-user access.
- Acceptance: create/edit/read/export tests pass; unauthorized paths and malicious files are rejected; artifacts are reopenable and verified.

### Phase 4 — Durable cloud tasks
- Add a durable task store and queue with run IDs, checkpoints, resumability, cancellation, retries and progress events.
- Persist only necessary task state; define retention and deletion controls.
- Add concurrency and cost budgets plus idempotency for every external side effect.
- Acceptance: a task survives worker restart, resumes without duplicate actions, and can be cancelled with a truthful terminal state.

### Phase 5 — Integrations and controlled actions
- Build a connector interface with least-privilege OAuth/scoped permissions, secret isolation, audit logs and revocation.
- Start with read-only integrations; add write actions only behind explicit per-action approval.
- Acceptance: permission denial is respected; revoked tokens stop working; every write action is attributable and auditable.

### Phase 6 — Memory, personalization and voice
- Add user-controlled memory review, correction, export and deletion; separate durable preferences from task-specific context.
- Improve Hindi/Hinglish, voice interruption, transcription correction and streaming UX.
- Acceptance: memory controls work end-to-end; language regression tests and noisy-voice tests pass.

### Phase 7 — Android and offline mode
- Evaluate on-device model options against device RAM, storage, latency, thermal and battery constraints.
- Keep online cloud Agent and offline local assistant as clearly distinct execution modes with capability disclosure.
- Acceptance: airplane-mode test demonstrates actual local inference, not canned quick replies; measure first-token latency, tokens/sec, memory use and battery impact on target devices.

### Phase 8 — Competitive evaluation and release
- Create a fixed benchmark of real user tasks: research with citations, multi-step planning, code debugging, file transformation, long tasks, recovery, Hindi/Hinglish and Android usage.
- Run the same prompts and scoring rubric against ORION and selected competing assistants; record quality, completion rate, time, cost and safety failures.
- Release only when critical security tests, deterministic CI, exact-SHA E2E and staged production smoke pass.

## Immediate implementation order

1. Establish a fresh, reproducible baseline on current `main`.
2. Add agent-core contract and fault-injection tests before broad refactoring.
3. Fix verified reliability defects in one focused PR.
4. Implement the browser adapter as a separate, gated workstream (do not simulate browser actions with search).
5. Implement scoped file workspace and artifact verification.
6. Add durable background tasks and approval gates.
7. Complete device/offline validation independently.
8. Run the benchmark and stage deployment only after all release gates pass.

## Non-goals / safeguards

- No claim of true AGI or superiority without benchmark evidence.
- No production deployment, merge to `main`, paid API enablement, secret changes, or irreversible external actions as part of this roadmap commit.
- Do not label search snippets as browser/computer use.
- Do not label pre-canned/offline quick answers as local model inference.
- Do not weaken E2E assertions merely to turn CI green.
