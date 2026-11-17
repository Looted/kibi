---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-core": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-opencode": patch
"kibi-zcode": patch
---

`kibi check --changed` and `kb_check` with `changed: true` give the pre-commit hook's verdict on every current change before anything is staged, and every finding now says what it stops. The check the hooks used to recommend after an edit looked only at the edit's impact: on a test project it returned no violations for a new function no requirement owned, and `kibi check --staged` then refused the commit of the same diff. The new mode refused it in 35 seconds with the real index untouched.

- `kibi check --changed [paths...]` runs the `--staged` gate over a scratch copy of the index with the working tree added (only the named paths and `.kb` when paths are given). The real index is never written and the scratch file is removed.
- `kb_check` `changed: true` (with optional `sourceFiles`) runs it in a child process and returns `commitAllowed` and the gate's findings.
- Every finding carries `blocks`: `"commit"`, `"merge"` or `"none"`. The full check tags its violations `merge`; the staged and changed gates tag theirs `commit`; advice is `none`.
- The post-edit and Stop messages of the Claude Code, Codex, Cursor, OpenCode and ZCode plugins recommend `kb_check` with `changed: true`, and a changed check counts as the impact check they ask for.
- The staged gate no longer saves its temporary store after every write batch and evaluates the evidence floor only for the requirements the commit touches. A one-function change on a test project with 8,457 entities went from 7m17s to 48s with the same verdict.
