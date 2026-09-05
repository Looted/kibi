---
id: TEST-kibi-legacy-migration-preview
title: Legacy migration preview vertical-slice tests
status: passing
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/tests/TEST-kibi-legacy-migration-preview.md
verification_scope: end_to_end
verification_perspective: consumer
tags: [requirements, migration, semantics, source-binding, packed, e2e]
links:
  - type: validates
    target: SCEN-kibi-legacy-migration-preview
---

Exercises `kibi.legacy-migration-plan.v1` through focused CLI and MCP integration tests plus a fresh packed CLI installation, including deterministic pagination, exact source hashes and spans, schema provenance, conflict blocking, and read-only behavior.
