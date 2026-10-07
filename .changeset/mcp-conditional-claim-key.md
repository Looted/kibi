---
"kibi-mcp": patch
---

Review notes written over MCP are no longer rejected. An observation or meta fact that quotes its claim in `claim_text` without a `claim_key` (for example a `review:ontology-gap` note) now passes `kb_upsert` input validation over MCP exactly as it already did on the CLI; every other fact kind that carries `claim_text` still needs `claim_key`.

The MCP JSON Schema to Zod converter evaluated `allOf` if/then rules by looking only at `required`, `anyOf` and `allOf` in the `if` condition, so the claim provenance rule's `not: {properties: {fact_kind: {enum: [observation, meta]}}}` branch was ignored. The new `matchesJsonSchemaCondition` evaluates conditions faithfully (`type`, `const`, `enum`, `required`, `properties` on present keys, `not`, `anyOf`, `allOf`, `oneOf` and boolean schemas).
