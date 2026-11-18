---
"kibi-agent-core": patch
"kibi-cursor": patch
"kibi-codex": patch
"kibi-opencode": patch
"kibi-claude": patch
"kibi-zcode": patch
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

Host hook fixes:

- Cursor stays quiet in a workspace that never adopted Kibi: no session-start advisory, no `.kb/` warning, no state written. A window opened on a subdirectory of a Kibi project now belongs to it.
- Cursor counts in-place shell edits (`sed -i`, `>`, `tee`) as source edits, and the stated-rule note and capture template follow such an edit.
- Shell edits run through `bash -c "..."` (string or argv form) are counted on every host.
- Codex keeps edited paths workspace-relative, so the `kb_check` the hook suggests clears its Stop reminder after an edit by absolute path.
- OpenCode counts a rule recorded through the CLI (`kibi record`, `kibi upsert`) or through a Kibi MCP server under any server key, so it no longer asks to record a decision that was recorded.
- Rule detection no longer reads bug reports ("the bug where users have to click twice"), pasted errors, hindsight ("we should never have shipped this"), indirect questions and single-quoted phrases as a rule.
- `kb_record` and requirement `kb_upsert` spell out the steps left before `kb_check` passes in the text result, for hosts that show the model only text (Cursor, Gemini CLI).
- The kibi-usage skill says how to read its resources (`resources/<name>`), and the managed AGENTS.md section points a stated rule at `kb_record`.
