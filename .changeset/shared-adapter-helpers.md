---
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-zcode": patch
"kibi-cursor": patch
---

No behaviour change for users of the Claude Code, Codex, ZCode or Cursor plugins: their hooks now share one copy of the workspace opt-in check and the hook input reader instead of keeping their own.

- `kibi-agent-core` adds two entry points. `kibi-agent-core/workspace-optin` resolves the Kibi workspace for a session directory and says whether it is opted in. `kibi-agent-core/hook-input` reads the hook payload from stdin and parses the Codex and ZCode payload fields.
- The Claude Code, Codex and ZCode hooks resolve the workspace through `kibi-agent-core/workspace-optin`. Their standalone MCP launchers keep their own copy, because they run without installed dependencies.
- The Codex and ZCode hooks parse their input through `kibi-agent-core/hook-input` and recognize Kibi MCP calls through `kibi-agent-core/kb-mcp-tools` directly, without a local wrapper. The Claude Code and Cursor hooks keep their own input parsers and read stdin through the shared reader.
