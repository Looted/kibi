---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

`kb_upsert` fixes for `implementedBy`, partial inventories and recorded reasons:

- MCP `kb_upsert` now runs the same entry point as `kibi upsert`, so `implementedBy` entries record their `implements` links over MCP too, and an entry that resolves to no declaration is refused with its candidates. Before, the MCP tool accepted the field, wrote the requirement and dropped the links without a warning.
- A requirement write may send `semantic_inventory` entries as `{claim_key, status, subjects}` for the claims it classifies, as the refusal text and the `kibi-usage` skill describe; Kibi fills in the rest of each entry from the prose. Before, schema validation refused such entries before the inventory was derived.
- A Context section that names who asked and the source before "Reason not stated", or a `rationale` that says so, now counts as no recorded reason: search answers mark `why` as not recorded and `kb_upsert` adds its missing-reason note. Before, only a section that started with those words did.
- `implementedBy` records one link when two entries name the same declaration (another spelling of the path, or `Class.method` and its bare method name), and reuses a stored symbol recorded under either name. A name with non-ASCII letters gets a non-empty symbol id, and a taken id gets a numbered one instead of a refusal. The refusal's candidates are the declarations `kb_upsert` accepts as granular links, now including exported constants and types.
- The `kb_upsert` result with `implementedBy` counts the symbol writes in `created` and `updated` and lists `.kb/symbols.yaml` in `sourceWrites`. A failed symbol write keeps the failure's error code and retryability, and a failed rollback under a refused write is no longer reported as retryable.
