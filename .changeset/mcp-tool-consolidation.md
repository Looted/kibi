---
"kibi-mcp": major
"kibi-cli": minor
"kibi-runtime": minor
---

The Kibi MCP server now offers 16 tools instead of 23, so agents load less tool text and pick the right call more often. Skills, prose modeling and upsert validation each moved behind one tool, and the remote SPARQL and job-polling tools are off unless you turn them on. CLI routes are unchanged.

- `kb_skills` with `action: "list" | "load" | "read"` replaces `kb_skills_list`, `kb_skills_load` and `kb_skills_read`.
- `kb_model` with `mode: "analyze" | "requirement" | "predicates"` replaces `kb_semantic_advisor`, `kb_model_requirement` and `kb_suggest_predicates`; inputs are unchanged and results carry the routed payload plus `mode`.
- `kb_upsert` with `dryRun: true` replaces `kb_validate_upsert`: it validates and returns the advisor receipt without writing and reports both write effects as skipped. `kb_upsert` checks its input schema first, so a payload with an unknown field or a wrong enum value now fails with an input error naming the field instead of a `valid: false` receipt; the CLI `validate-upsert` route keeps the lenient preview.
- `kb_sparql_remote` and `kb_job_status` register only when `KIBI_MCP_OPTIONAL_TOOLS` names them (comma-separated, or `all`). Without `kb_job_status`, `kb_check` with `async: true` runs synchronously.
- The operation catalog gains composite `kb_skills` (CLI `kibi skill`) and `kb_model` (CLI `kibi model`); the narrower operations and their CLI routes remain. Usage telemetry records the routed operation name, so acceptance metrics are unchanged.
- Semantic advisor warnings and predicate diagnostics name `kb_model (mode requirement)` and `kb_model (mode predicates)` instead of the removed tool names.
- Migration: replace calls to the removed tool names as above. The frozen `tools/list` fixtures change accordingly.
