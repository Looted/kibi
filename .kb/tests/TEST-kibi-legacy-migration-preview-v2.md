---
id: TEST-kibi-legacy-migration-preview-v2
title: Semantic source separation packed vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/tests/TEST-kibi-legacy-migration-preview-v2.md
verification_scope: end_to_end
verification_perspective: consumer
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview-v2
---

Exercises semantic-source separation through focused CLI, Core, and MCP contract tests plus a fresh packed installation. It proves that authored prose is persisted and previewed through `semantic_text`, independent `text_ref` evidence is retained, semantic source drift fails closed, CLI and MCP return equivalent plans, and preview calls do not mutate source or KB state.
