---
"kibi-cli": patch
"kibi-cursor": patch
"kibi-codex": patch
---

Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.

- Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
- Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.
