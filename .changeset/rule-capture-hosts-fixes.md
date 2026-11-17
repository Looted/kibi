---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-runtime": patch
"kibi-cli": patch
---

Agent hooks: rules written as list items or with emphasis (`- Never log API keys`, `**Never** ...`), or after phrases such as "also", "let's", "remember to", "need to" and "may never", read as rules again. Descriptions ("tokens currently never expire, and always have been stored"), "never mind", "never-ending" and "always a pleasure" no longer do, and `~~~` fences, indented code blocks, `>` quoted text and questions asking to be told something are skipped.

The rule capture template now carries the `## Context` and `## Source` sections kb_check asks of a new requirement and says a scenario and test come next. Claude Code no longer counts a `kb_upsert` dry run as a recorded decision. Cursor delivers the capture template with the first source edit of a rule session instead of the second. Sessions without a session id no longer share one set of markers forever: a new session starts afresh (on Claude Code, unless it resumes or compacts the last one), a session without an id that has been idle for two hours ends at the next prompt, and markers of sessions untouched for a week are removed at session start.
