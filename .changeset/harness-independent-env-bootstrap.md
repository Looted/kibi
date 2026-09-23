---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Provider secrets now resolve the same way in every harness: existing process env wins, then project `.env.kibi` (or `KIBI_ENV_FILE`), then `~/.config/kibi/env`, with legacy `.env` only filling gaps. `kibi doctor` reports secret source labels and Jev model/timeout without leaking values, and fails when a declared plugin secret is missing.

- Add shared `bootstrapKibiEnvironment` / `inspectSecretSource` (CLI entrypoint + MCP `startServer`)
- Re-export env bootstrap from `kibi-runtime` for MCP
- Extend capability-plugins doctor check with secret sources and Jev safe config
- Prefer `.env.kibi` over generic `.env` as the project secret file
