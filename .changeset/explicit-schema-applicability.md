---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

`kb_model` with `mode: "predicates"` and an explicit `schemaId` now accepts a project-local schema when the claim names the predicate and every one of its arguments. Before, a schema without keywords or examples scored below the applicability threshold and was refused even though the claim stated it directly. When an explicitly selected schema is still refused, the reasons now list which predicate or argument names the claim leaves out.
