---
"kibi-mcp": patch
"kibi-cli": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Kibi keeps answering from the right place when you work in a git worktree, a detached checkout, or on a machine without Prolog. Host launchers no longer pin the MCP server to the first workspace, so per-call workspace routing keeps working, and a missing Prolog runtime points at `kibi doctor` instead of failing opaquely.

- Claude Code, Codex, Cursor and Z Code launchers set `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE`; the server starts in that directory without disabling routing. `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT` and `KIBI_ROOT` still pin.
- A detached HEAD whose commit is the tip of exactly one local branch attaches that branch's KB.
- `kb_status` reports `swipl_*` error codes with a `kibi doctor` remediation when the Prolog runtime cannot be resolved.
- CI and publish check that the committed Claude hook bundle matches its source.
