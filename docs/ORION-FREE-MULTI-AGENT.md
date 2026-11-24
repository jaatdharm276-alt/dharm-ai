# ORION Free Multi-Agent Architecture

Status: first implementation slice on `feature/orion-free-multi-agent`.
Budget target: ₹0 additional spend. Existing provider quotas and GitHub Actions limits still apply.

## What this slice implements

- Keeps ORION as the central controller and reuses the existing planner, research, coder, security-reviewer and verifier roles.
- Adds a provider-neutral bounded team runner. The actual provider is supplied by the caller; this does not pretend the roles are separate vendor agents.
- Runs up to three specialists concurrently, preserves result order, limits task and output sizes, and returns explicit completed/failed/timed-out/cancelled states.
- Propagates each worker's cancellation/timeout signal into the existing model call.
- Adds an action policy that marks repository writes, commits, pushes, PR creation, merges, deployments, secret/permission changes and destructive actions as requiring explicit user approval.
- Preserves the existing Agent route contract and does not add paid SDKs or new dependencies.

## Current honest capability boundary

The production Agent currently calls the configured Groq-compatible model. The specialist roles are separate role prompts executed through that same configured provider. They are not independent Copilot, OpenAI Codex or Anthropic Claude sessions.

This slice does not yet provide:
- A GitHub App/OAuth installation flow or repository write adapter.
- A persistent background task queue or durable run history. The mobile `/agents` Control Room now exists and displays live SSE activity events while a request is connected.
- Independent vendor-provider execution.
- Automatic merge or production deployment.

No paid vendor plan is required for the first slice. Optional future providers must be explicitly configured, expose their availability and quota, and never be represented as free when they are not.

## Next implementation phases

1. Add a least-privilege GitHub App connection flow. Start read-only; store credentials only in server-side secrets and support revocation.
2. Add repository task workspaces: inspect files, create an isolated feature branch, propose edits, run checks, and prepare a draft PR. Require per-action user approval before writes.
3. Add durable task records and progress events so Android users can monitor, resume and cancel tasks.
4. Add the Agent Control Room UI with provider/role status, changed-file list, test evidence, PR link and approval controls.
5. Add optional provider adapters only when a genuinely usable free tier or user-provided key is available. Default remains the existing configured provider.
6. Add adversarial tests for prompt injection in repository content, cross-user isolation, token revocation, duplicate writes, cancellation, provider quotas and approval bypass attempts.

## Safety invariants

- Never store a GitHub token in browser storage or expose it to the model.
- Repository content, issue text, web pages and tool output are untrusted data, not instructions.
- Read operations may run within granted scope; every write, commit, push, PR creation, merge, deployment, secret change, permission change or deletion requires explicit user approval.
- No automatic merge or production deployment.
- Show provider identity, quota/rate-limit failures and the exact commit SHA used for verification.
- Do not claim a check passed unless its result is available for the exact tested commit.


## Current PR update

The Control Room now parses `orion_status` server-sent events and renders a bounded live activity timeline. This is request-scoped only: refreshing the page loses the timeline, and it does not create durable tasks or expose repository diffs. The next blocked integration requires a registered GitHub App (or OAuth application), least-privilege installation permissions, server-side credentials and an explicit user-controlled connect/revoke flow. Do not substitute a broad personal access token or expose credentials to the browser/model.
