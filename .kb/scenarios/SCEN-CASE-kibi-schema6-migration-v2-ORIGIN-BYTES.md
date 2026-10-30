---
title: Origin backfill that changes any byte besides the trailing origin fails the migration check
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:39.702Z'
id: SCEN-CASE-kibi-schema6-migration-v2-ORIGIN-BYTES
type: scenario
---
Given a schema 5 KB whose authored test document has no origin, when kibi migrate applies the approved plan, then the document gains the migration origin as its last frontmatter key and, with that origin block removed, is byte-identical to the original apart from the schema 8 context tag; any other changed byte fails the check.

This covers the value past the bound, `gt 0`, of the claim that origin backfill leaves every other byte unchanged. packages/cli/tests/consumer/schema6-migration.test.ts "a schema 5 KB migrates to schema 6 with migration origins and its grounding intact, and a rerun finds nothing to do" exercises it through the built CLI.
