---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Usage telemetry now records a skill loaded through `kibi skills load`, `kibi skills-load`, `kibi skill` with `action: "load"` or MCP `kb_skills`, so later operations in that workspace report `skill_loaded_before`. Before this, only host hooks marked a load. Only the workspace path's hash is stored.

kibi-usage 2.46.0:

- The safe workflow says each relationship is sent in the write of its `from` entity, and points to the direction table.
- The direction table adds `requires_predicate`, `requires_rule`, `assumes`, `depends_on` and `exempts`, and explains `relationship_source_mismatch`.
- A payload rejected twice with a typed error is not resent; fix the rule and field the error names.
- A route too old for a rule or field the skill names is reported as a version gap.
- Split children get titles with the words a reader searches for.
