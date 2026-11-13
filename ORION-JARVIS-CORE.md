# ORION JARVIS CORE

ORION JARVIS CORE is the bounded agentic execution layer for ORION AI. It is inspired by modern tool-using agent architectures; it is not Claude's proprietary internal brain and it is not a claim of artificial general intelligence.

## Current architecture

- **Main brain:** Groq's OpenAI-compatible chat-completions API using `openai/gpt-oss-120b`.
- **Agent router:** Agent mode in the existing chat UI routes to `/api/agent`; normal Chat, Study, Work and Content modes continue using `/api/chat`.
- **Agentic brain cycle:** A dedicated planner specialist creates an explicit task plan before execution. The main brain can adapt that plan as tool evidence arrives, then an independent verifier checks the proposed answer before final delivery.
- **Tool loop:** The server can request tools, execute them, return tool results to the model, and repeat within a bounded budget.
- **Specialist agents:** Planner, research analyst, coder, security reviewer and verifier. These are role-specialized model calls, not separate independently hosted models.
- **Built-in tools:** India date/time, restricted arithmetic parser, optional read-only public web search, and specialist delegation.
- **Safety:** Request-size limits, server-side API keys, bounded tool/search/delegation counts, untrusted search-result handling, no arbitrary shell/code execution, and no side-effecting device/account tools.

## Environment setup

Copy `.env.example` to your local `.env.local` and configure:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | Chat and agent model requests |
| `TAVILY_API_KEY` | No | Live web search for Agent mode |

Never commit `.env.local` or real API keys. The repository ignores local environment files and keeps only the safe `.env.example` template.

## Agent mode flow

1. Receive the user task and recent conversation context.
2. The planner specialist creates an ordered plan, dependencies, risks, and completion checks.
3. The main brain follows or adapts the plan and decides which bounded tools or specialists are useful.
4. Execute only the declared tools and feed their outputs back into the main brain.
5. The verifier specialist independently checks the proposed answer for gaps, unsupported claims, and safety issues.
6. The main brain incorporates verification findings and delivers the final, limitation-aware answer.

## Not yet integrated

This first agentic foundation does **not** yet provide persistent cross-session memory, Android system-level control, camera/hand-gesture/sensor input, smart-home control, file-system writes, account actions, or unattended background automation. Those require dedicated storage, Android companion/native permissions, provider integrations, and explicit approval/audit flows. The current web app must not claim these actions are available.

## Validation

GitHub Actions runs the Next.js production build on pushes to `main` and `orion-ai/**` branches. Check the Actions run for the exact commit before treating a change as build-verified.
