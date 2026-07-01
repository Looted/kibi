---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
---

Coverage reports now explain how deep each requirement's test evidence goes without changing existing covered/uncovered semantics. CLI users and MCP clients can distinguish direct passing e2e evidence, scenario-backed e2e evidence, unit-only evidence, nonpassing test evidence, scenario-only coverage, and no evidence at all. Typed test verification fields are honored before legacy e2e tag/path heuristics, so modern test metadata produces more reliable coverage labels.

Technical summary:
- Add additive `coverageDepth` / `coverage_depth` fields and coverage evidence lists to requirement coverage rows.
- Classify coverage depth from direct requirement tests, scenario tests, test statuses, and typed `verification_scope` values.
- Surface coverage depth in CLI table output and MCP structured coverage results while preserving existing summary and `coverageStatus` fields.
- Allow typed `verification_scope` and `verification_perspective` test fields through CLI/MCP entity schemas and MCP upsert serialization.
