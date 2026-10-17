---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Routine dependency refreshes: the Kibi CLI picks up a patch release of its YAML parser, the MCP server a newer zod validation library, and the OpenCode plugin a newer OpenCode plugin SDK and TUI toolkit. No behavior change is intended.

Bumps `yaml` to ^2.9.1 (kibi-cli), `zod` to ^4.6.7 (kibi-mcp), and `@opencode-ai/plugin` to ^1.19.0 with `@opentui/core` and `@opentui/solid` to ^0.6.3 (kibi-opencode); the OpenCode TUI bundle still builds and its tests pass against the new toolkit.
