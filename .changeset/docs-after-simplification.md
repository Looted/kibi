---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-mcp": patch
---

Docs and skill text now match the smaller default tool list and the shared session brief. They no longer say that every session lists all 16 MCP tools, and each host plugin's README describes what its session start now adds.

- The `operation-access` resource of `kibi-usage`, the CLI reference, Connect an agent, the OpenCode Code Mode note and the `kibi-mcp` README say that a session lists six tools unless the `full` profile is chosen, and that the rest run through the CLI with the same input.
- The Claude Code, Codex, Cursor and ZCode READMEs describe the shared session brief their session start adds.
- `kibi-commit-review`'s staged-gate resource points at the `kibi-usage` Record step. It used to point at the Safe workflow section, which the core-arc split removed.
- The landing page FAQ says `kb_check` reports how many rules it evaluated, now that the rule list appears only when a default rule did not run.
