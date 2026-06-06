---
"kibi-mcp": patch
"kibi-cli": patch
---

Agents now get clearer guidance when modeling Kibi facts and predicates. Instead of opaque validation errors that encourage falling back to prose, common mistakes now point to exact snake_case fields and typed value payloads.

The documentation also gives agents a compact path for choosing between requirements, strict facts, predicate facts, observations, and metadata. This makes semantic KB modeling easier to apply consistently across projects such as Align.

- Improve `kb_upsert` diagnostics for camelCase fact fields and incomplete strict/predicate facts.
- Add modeling-helper warnings for low-confidence requirement downgrades and ontology-gap predicate suggestions.
- Add modeling cheatsheet, MCP error reference, and Align KB improvement prompt.
