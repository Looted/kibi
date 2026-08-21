---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-core": patch
---

Predicate suggestions now abstain more safely when relevance is weak or bindings are unreviewed, while explaining candidate eligibility and rejection reasons.

When a genuine ontology gap remains, agents receive a reviewable schema draft instead of an empty recommendation. Reusable launcher schemas and regression coverage improve guidance for consumer-local package resolution and process execution.

- Add public applicability, binding-provenance, score diagnostics, abstention, and recommended-schema draft fields.
- Add five launcher-oriented schemas, Cursor launcher coverage, MCP assertions, and reference documentation.
- Preserve `requires_rule` relationship shards during source-first extraction and sync.
- Compose multi-entity authored deletions targeting one source file into a single hash-bound write.
- Fail packed E2E bootstrap immediately when shared npm installation exits unsuccessfully, preserving command output for diagnosis.
- Scope explicit `kb_check --rules` diagnostics in the Prolog check path instead of evaluating the full rule aggregate first.
- Fix Logic IR dependency extraction so positive stored rules remain ground and stratification checks terminate.
- Normalize RDF-typed `rule_schema_id` references before rule verifiability lookup and cover the repair with Prolog regressions.
