---
"kibi-agent-core": minor
"kibi-cli": patch
"kibi-mcp": patch
"kibi-claude": patch
---

Usage telemetry data is cleaner and more complete. Telemetry is now off when the home directory lies inside the temp directory, as eval, packaging and end-to-end harnesses set it, so each harness run no longer counts as a new install; Kibi's own eval and packed-test sandboxes also set `KIBI_TELEMETRY=0`. Events now name the host agent from `CLAUDECODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `GEMINI_CLI`, `OPENCODE`, `AI_AGENT` or the MCP client name, carry the hashed host session id from `CLAUDE_CODE_SESSION_ID` (or `KIBI_SESSION_ID`) for the CLI and MCP server too, and say whether they come from a hosted cloud workspace. Failed CLI commands and MCP tool results now carry a fixed error category: the result's error code (for example `upsert_dry_run_invalid`), the failing `kibi doctor` checks, or the `kibi migrate` approval problem. `kibi migrate --apply-safe` now prints the current plan hash when the approved hash is missing or out of date.
