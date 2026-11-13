# ORION JARVIS CORE

ORION JARVIS CORE is the bounded agentic execution layer for ORION AI. It is inspired by modern tool-using agent architectures; it is not Claude's proprietary internal brain and it is not a claim of artificial general intelligence.

## Current architecture

- **Main brain:** Groq's OpenAI-compatible chat-completions API using `openai/gpt-oss-120b`.
- **Agent router:** Agent mode in the existing chat UI routes to `/api/agent`; normal Chat, Study, Work and Content modes continue using `/api/chat`.
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
2. Ask the main model to decide whether a tool or specialist is useful.
3. Execute only the declared, bounded tools.
4. Feed tool outputs back into the model for further work.
5. Stop at the tool budget and produce a verified, limitation-aware answer.

## Not yet integrated

This first agentic foundation does **not** yet provide persistent cross-session memory, Android system-level control, camera/hand-gesture/sensor input, smart-home control, file-system writes, account actions, or unattended background automation. Those require dedicated storage, Android companion/native permissions, provider integrations, and explicit approval/audit flows. The current web app must not claim these actions are available.

## Validation

GitHub Actions runs the Next.js production build on pushes to `main` and `orion-ai/**` branches. Check the Actions run for the exact commit before treating a change as build-verified.
