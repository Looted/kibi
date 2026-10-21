---
"kibi-runtime": patch
"kibi-cli": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The `kibi-freshness` and `kibi-traceability` skills now spell out the order of Kibi calls the agent should make and how to finish authorized writes.

- `kibi-freshness` runs `kb_status`, then `kb_query`, then `kb_check` before it answers. Consistency questions run `kb_query`, `kb_check` and then `kb_coverage`, and any unmodeled clause is reported as incomplete analysis rather than consistent.
- `kibi-traceability` starts with `kb_search`, then runs `kb_query` and `kb_graph`, and ends with `kb_status`. It grounds scenario feasibility in the queried entities.
- Both skills treat a passing `dryRun` upsert as validation only. They then perform the real write and read it back before the final checks.

In the 2026-10-21 SkillOpt campaign, on the Claude Code host, the freshness mean rose from 68.67 to 96.67 and the traceability mean from 45.67 to 76.67, with no family regressing. The campaign report is `documentation/evaluations/skillopt/reports/2026-10-21-report.md`.
