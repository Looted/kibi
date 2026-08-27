---
id: TEST-007
title: Prolog KB attaches, asserts, and retrieves entities correctly
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-08-02T00:00:00.000Z
priority: must
tags:
  - prolog
  - core
  - unit
links:
  - type: validates
    target: REQ-core-persistence
  - type: validates
    target: SCEN-001
---

Calls `kb_attach/1` on a temp RDF store, then `kb_assert_entity/2` with a valid
entity term, then `kb_entity/3` to retrieve it. Asserts the round-trip preserves
all properties. Also validates that schema violations (unknown type, missing title)
are rejected by `kb_assert_entity/2`.

The CLI symbol-manifest unit suite verifies that refreshes extract coordinates into the generated artifact while stripping both legacy and newly enriched coordinate fields from authored entries. It also restores coordinate-writer mocks between cases so warning paths cannot pollute later tests.
