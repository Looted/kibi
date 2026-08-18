---
id: REQ-kibi-legacy-migration-preview-v2
title: Legacy migration previews separate semantic prose from evidence
status: open
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/requirements/REQ-kibi-legacy-migration-preview-v2.md
priority: must
tags: [requirements, migration, semantics, source-binding, parity]
logic_claims:
  - CLAIM-DFB228EE043C9A35
  - CLAIM-1A7A84D3AE9AAA9B
  - CLAIM-06AF50DD30B2936E
  - CLAIM-82F2F30D20875802
  - CLAIM-9FE58D102925298C
  - CLAIM-5C5B0557E815C91F
  - CLAIM-0B2599C102317FA5
  - CLAIM-048124363EA459A2
  - CLAIM-7F8A85CA806B465C
  - CLAIM-783C35DFF9BFF1AF
  - CLAIM-2AECE7D2C4B1478A
semantic_clauses:
  - Requirement coverage must emit a versioned deterministic legacy migration plan when includeMigrationPreview is true
  - The planner must select only ready semantic_inventory batches from a complete dependency-ordered repair-plan scope
  - Each preview batch must reconstruct the normalized authored Markdown body and bind every proposition to an exact SHA-256 source hash and UTF-8 span
  - Authored requirement prose must be persisted in requirement-only semantic_text while an independent text_ref remains unchanged
  - An existing semantic_text that differs from current normalized authored Markdown must block preview application as semantic source drift
  - Every assertive proposition must receive exactly one recommended lane or explicit unresolved disposition while nonlogical prose remains outside logic claims
  - Predicate rankings must preserve exact schema identifiers, signatures, origins, scores, polarity, and unbound arguments for project-local and built-in schemas
  - No candidate with an incomplete binding may produce an applicable write
  - The default preview must return one requirement batch with deterministic pagination and an explicit next offset
  - Every batch must be read-only, non-auto-applicable, and contain only a reviewed property-patch preview
  - CLI and MCP requirement coverage must expose semantically identical plans without changing source files or KB bytes
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9f7fa8b935289de178016ce86f4ebc73a9aba3d47074979fa2e66da45e7ea9e6
semantic_inventory:
  - claim_key: CLAIM-DFB228EE043C9A35
    claim_text: Requirement coverage must emit a versioned deterministic legacy migration plan when includeMigrationPreview is true
    role: normative
    status: modeled
    span: {start: 0, end: 115}
  - claim_key: CLAIM-1A7A84D3AE9AAA9B
    claim_text: The planner must select only ready semantic_inventory batches from a complete dependency-ordered repair-plan scope
    role: normative
    status: modeled
    span: {start: 117, end: 231}
  - claim_key: CLAIM-06AF50DD30B2936E
    claim_text: Each preview batch must reconstruct the normalized authored Markdown body and bind every proposition to an exact SHA-256 source hash and UTF-8 span
    role: normative
    status: modeled
    span: {start: 233, end: 380}
  - claim_key: CLAIM-82F2F30D20875802
    claim_text: Authored requirement prose must be persisted in requirement-only semantic_text while an independent text_ref remains unchanged
    role: normative
    status: modeled
    span: {start: 382, end: 508}
  - claim_key: CLAIM-9FE58D102925298C
    claim_text: An existing semantic_text that differs from current normalized authored Markdown must block preview application as semantic source drift
    role: normative
    status: modeled
    span: {start: 510, end: 646}
  - claim_key: CLAIM-5C5B0557E815C91F
    claim_text: Every assertive proposition must receive exactly one recommended lane or explicit unresolved disposition while nonlogical prose remains outside logic claims
    role: normative
    status: modeled
    span: {start: 648, end: 804}
  - claim_key: CLAIM-0B2599C102317FA5
    claim_text: Predicate rankings must preserve exact schema identifiers, signatures, origins, scores, polarity, and unbound arguments for project-local and built-in schemas
    role: normative
    status: modeled
    span: {start: 806, end: 964}
  - claim_key: CLAIM-048124363EA459A2
    claim_text: No candidate with an incomplete binding may produce an applicable write
    role: descriptive
    status: modeled
    span: {start: 966, end: 1037}
  - claim_key: CLAIM-7F8A85CA806B465C
    claim_text: The default preview must return one requirement batch with deterministic pagination and an explicit next offset
    role: normative
    status: modeled
    span: {start: 1039, end: 1150}
  - claim_key: CLAIM-783C35DFF9BFF1AF
    claim_text: Every batch must be read-only, non-auto-applicable, and contain only a reviewed property-patch preview
    role: normative
    status: modeled
    span: {start: 1152, end: 1254}
  - claim_key: CLAIM-2AECE7D2C4B1478A
    claim_text: CLI and MCP requirement coverage must expose semantically identical plans without changing source files or KB bytes
    role: normative
    status: modeled
    span: {start: 1256, end: 1371}
links:
  - type: depends_on
    target: REQ-kibi-dependency-ordered-repair-plan
  - type: depends_on
    target: REQ-kibi-proposition-complete-ingestion
  - type: specified_by
    target: SCEN-kibi-legacy-migration-preview-v2
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-OPT-IN
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-READY-SCOPE
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-SOURCE-BOUND
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-SEMANTIC-SOURCE
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-SEMANTIC-DRIFT
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-ONE-DISPOSITION
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-SCHEMA-PROVENANCE
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-NO-INCOMPLETE-WRITE
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-PAGINATION
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-READ-ONLY
  - type: requires_predicate
    target: FACT-LEGACY-MIGRATION-PARITY
---

Requirement coverage must emit a versioned deterministic legacy migration plan when includeMigrationPreview is true. The planner must select only ready semantic_inventory batches from a complete dependency-ordered repair-plan scope. Each preview batch must reconstruct the normalized authored Markdown body and bind every proposition to an exact SHA-256 source hash and UTF-8 span. Authored requirement prose must be persisted in requirement-only semantic_text while an independent text_ref remains unchanged. An existing semantic_text that differs from current normalized authored Markdown must block preview application as semantic source drift. Every assertive proposition must receive exactly one recommended lane or explicit unresolved disposition while nonlogical prose remains outside logic claims. Predicate rankings must preserve exact schema identifiers, signatures, origins, scores, polarity, and unbound arguments for project-local and built-in schemas. No candidate with an incomplete binding may produce an applicable write. The default preview must return one requirement batch with deterministic pagination and an explicit next offset. Every batch must be read-only, non-auto-applicable, and contain only a reviewed property-patch preview. CLI and MCP requirement coverage must expose semantically identical plans without changing source files or KB bytes.
