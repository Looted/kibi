---
"kibi-cursor": patch
---

Local Cursor MCP builds now compile plugin SDK/builtin dist before the CLI, so a fresh checkout no longer fails with a missing `kibi-plugin-builtin` type package.

- `build:cli-stack` runs plugin-sdk + plugin-builtin + CLI
- Worktree resolver uses that stack instead of `build:cli` alone
