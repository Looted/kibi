---
"kibi-agent-core": minor
"kibi-cli": patch
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
---

Usage telemetry data is cleaner and more complete. Telemetry is now off when the home directory lies inside the temp directory, as eval, packaging and end-to-end harnesses set it, so each harness run no longer counts as a new install; Kibi's own eval and packed-test sandboxes also set `KIBI_TELEMETRY=0`. Events now name the host agent from `CLAUDECODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `GEMINI_CLI`, `OPENCODE`, `AI_AGENT` or the MCP client name, carry a hashed host session id in every host, and say whether they come from a hosted cloud workspace. Failed CLI commands and MCP tool results now carry a fixed error category: the result's error code (for example `upsert_dry_run_invalid`), the failing `kibi doctor` checks, or the `kibi migrate` approval problem. `kibi migrate --apply-safe` now prints the current plan hash when the approved hash is missing or out of date.

Hooks in Claude Code, Codex, Cursor, ZCode and OpenCode now all send the anonymous `kibi_hook` event (before, only Claude Code did, and only in diagnostic mode for the others), and each hook remembers, as hashes in `telemetry-sessions.json`, which host session last ran in the workspace. CLI and MCP events take the session id from `KIBI_SESSION_ID`, `CLAUDE_CODE_SESSION_ID` or `CODEX_THREAD_ID` when the host exposes one, and otherwise from that workspace marker (at most 30 minutes old), so events from Cursor and OpenCode sessions, which expose no session variable, can be grouped too. Every host's hook also sends the queue when it is due, and right away at the end of a turn.
