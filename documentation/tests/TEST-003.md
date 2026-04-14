---
id: TEST-003
title: kibi query returns correct entities and outgoing relationships
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-03-20T17:45:00.000Z
priority: must
tags:
  - cli
  - query
  - unit
links:
  - type: validates
    target: SCEN-006
---

Asserts that:
- `kibi query req` returns only `req` type entities
- `kibi query req --id REQ-001` returns exactly one entity
- `kibi query req --tag core` returns only entities tagged `core`
- `kibi query --relationships REQ-001` returns the entity's outgoing relationships
- `kibi query req --format table` outputs tabular text without JSON parse errors
