---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": minor
---

An agent looking for prior intent now gets what a requirement says and why it exists in the first answer, and the edit hook shows the recorded reason before code that implements a requirement is changed. `kb_search` answers are smaller by default: graph paths and per-fact `kb_query` calls now come only with `fields: "full"`.

- Each `kb_search` `answer.governing[]` entry carries `statement` (its `semantic_text`, else the statement its body derives, at most 300 characters). A reason taken from the requirement itself carries `said: { by, on }`: the approver from `origin.approved_by`, else the origin's kind (`human`, `agent` or `import`), and the date the origin was recorded. A migration origin names neither.
- Breaking: without `fields: "full"`, `results[].evidence` no longer has `graphPaths`, and answer facts (governing and ungoverned) no longer carry `ask`. `moreFacts.ask`, `abstained` and `ambiguous` are unchanged. To get the old shape, pass `fields: "full"`, which also reloads complete entity bodies.
- The shared edit snippet (Claude Code, Codex, Cursor, ZCode, and OpenCode's edit bullet) adds one `Why:` line for the lead requirement: its reason, where it was recorded, and who and when from its origin, or `Why: no reason is recorded.` The line appears once per file per session with the rest of the first edit snippet. A snippet over its 1,200-character budget now lists fewer requirements, fewer claims and a shorter reason before anything is cut, so the Why line and the follow-up calls stay in it.
- Entity summaries in `kibi-agent-core` read up to 64 KiB of a requirement document (8 KiB for other entities) and carry `why`.
- A requirement's reason, in the search answer and on the Why line, now comes from its `rationale` field, then its Why, Rationale or Context section, then its "Why this changed" section (then, in the search answer, a linked ADR). A line or list item that only notes a split or supersede ("Split from REQ-…", "Superseded by …") is skipped, so the reason is no longer a note about where the text came from.
