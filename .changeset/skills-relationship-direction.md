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

Usage telemetry now records a skill loaded through `kibi skills load`, `kibi skills-load`, `kibi skill` with `action: "load"` or MCP `kb_skills`, so later operations in that workspace report `skill_loaded_before`. Before this, only host hooks marked a load. The mark belongs to the workspace root that answered the call: the CLI resolves it from the directory it runs in, and the MCP server uses the workspace it serves (a call routed to another workspace is recorded by that workspace's server), so a server started in a home directory no longer marks every repository below it. A mark counts only for its own workspace root, not for directories below it. Only the workspace path's hash is stored.

kibi-usage 2.47.0: a payload rejected twice with a typed error is not resent; the agent fixes the rule and field the error names, or follows `nextActions`. The relationship direction table adds `requires_predicate`, `requires_rule`, `assumes`, `depends_on` and `exempts`, and explains `relationship_source_mismatch`.
