# Workflows

## Discovery to Validation Sequence

The canonical workflow for any KB operation follows this pattern:

1. **Discover**: `kb_search` with focused probes
2. **Confirm**: `kb_query` for exact IDs and state
3. **Inspect**: `kb_status` when freshness matters
4. **Create endpoints**: `kb_upsert` for new entities (sequential)
5. **Link**: `kb_upsert` with relationship rows (sequential)
6. **Validate**: `kb_check` with targeted rules during work, full check at completion

## Creating a New Feature
```
1. kb_search to discover existing requirements and related knowledge
2. kb_query to confirm exact IDs and source-linked context
3. kb_upsert for new or updated requirements (include relationship rows)
4. kb_check with targeted rules
```

## Small Behavior Fix With No Existing Requirement
```
1. kb_search and kb_query by the changed source file and test file.
2. If no requirement exists, create a REQ for the corrected behavior.
3. Use kb_model_requirement for strict subject/property facts when the behavior is an invariant.
4. Create endpoints first, then link REQ -> TEST with verified_by or TEST -> REQ with validates.
5. Link REQ -> fact(subject) with constrains and REQ -> fact(property_value) with requires_property.
6. Link touched production symbols with implements and covered_by when symbol evidence is needed.
7. Author and stage tracked markdown/symbol evidence; MCP writes do not stage those files automatically.
8. Run kb_check with targeted rules, then a final full check.
```

Do not create a test-fact pair. Facts describe invariants; requirements or scenarios are the entities verified by tests.

## Fixing a Traceability Gap
```
1. kb_query --sourceFile <code-file> to find linked entities
2. kb_find_gaps --type req --missing-rel specified_by to find orphan requirements
3. kb_upsert to add missing relationship rows (sequential)
4. kb_check with rules: ["no-dangling-refs", "symbol-traceability"]
```
