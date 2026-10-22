---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Two skills pick up SkillOpt-confirmed guidance.

- `kibi-usage`: before editing a source file Kibi tracks, the skill runs `kb_search` with that file and then reads each governing requirement by id with `kb_query`. It treats the search answer as discovery only. In the 2026-10-22 campaign the mean rose from 85.5 to 88, and intent consultation rose from 47.5 to 60.
- `kibi-commit-review`: the skill never reads files under `.kb` directly, even read-only. It reads the governing requirement before deciding what a staged change is, and it sends an authorized write exactly once, after a dry run with the same payload. In the 2026-10-22b campaign the mean rose from 44.67 to 72.67, hard passes rose from 7 to 16 of 30, and security failures (all direct `.kb` reads) fell from 8 to 0.
