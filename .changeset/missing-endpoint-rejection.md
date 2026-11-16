---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

A `kb_upsert` that links to an entity the KB does not hold yet is now refused as a rejection that says how to fix the payload, instead of a generic operation failure. `kibi prove` on a selection with no proof-bearing test now reports "no proof-bearing tests selected" and exits 0 even when proof integrations are not configured yet.

- `kb_upsert` and `kb_validate_upsert` turn the store's missing source or target endpoint into the `RELATIONSHIP_ENDPOINT_MISSING` rejection. The message names the missing entity and its role, and says to create it first or write both entities in the same `kb_apply_plan`. Telemetry counts it as `rejected`, not `error`. A missing entity outside a relationship stays an ordinary failure.
- `kibi prove` selects tests before it reads `.kb/proof/integrations.json`, so the missing-configuration error appears only when a selected test needs an integration.
