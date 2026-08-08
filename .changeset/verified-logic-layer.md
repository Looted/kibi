---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
---

Kibi can now turn a requirement’s assertive prose into reviewable, typed logical models while keeping the original wording for people. Conditional rules, obligations, permissions, prohibitions, exceptions, bounded quantities, and temporal qualifiers are validated before they enter the knowledge base, and contradictions can report structured witnesses instead of relying on executable text. Existing requirements remain compatible and can be migrated or backfilled deliberately.

- Add versioned `kibi.logic.v1` IR, safe bounded Prolog interpretation, rule schemas, rule facts, provenance, and contradiction checks.
- Extend the semantic advisor with proposition inventories, typed alternatives, source spans, shadow audits, and logic apply plans.
- Preserve rule fields and `requires_rule` through CLI, MCP, Markdown, Prolog, and schema validation surfaces.
- Add rule safety, rule verifiability, and semantic completeness checks plus schema-v4 migration metadata.
