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

kibi-usage 2.47.0: a payload rejected twice with a typed error is not resent; the agent fixes the rule and field the error names, or follows `nextActions`. The relationship direction table adds `requires_predicate`, `requires_rule`, `assumes`, `depends_on` and `exempts`, and explains `relationship_source_mismatch`.
