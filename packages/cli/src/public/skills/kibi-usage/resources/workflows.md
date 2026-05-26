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

## Fixing a Traceability Gap
```
1. kb_query --sourceFile <code-file> to find linked entities
2. kb_find_gaps --type req --missing-rel specified_by to find orphan requirements
3. kb_upsert to add missing relationship rows (sequential)
4. kb_check with rules: ["no-dangling-refs", "symbol-traceability"]
```

## Before Risky Work
```
1. /brief-kibi or kb_briefing_generate for citation-backed briefing
2. Inspect briefingState; proceed only if ready
3. Use constraints, regressionRisks, and cited entities from the briefing
```
