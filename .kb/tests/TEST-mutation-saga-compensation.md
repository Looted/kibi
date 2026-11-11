---
title: Mutation saga rolls back multi-surface mutations in reverse order exactly once
status: passing
verification_scope: unit
id: TEST-mutation-saga-compensation
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This checks the saga's promise: steps roll back in reverse order, exactly once, never past the commit point, and rollback failures are aggregated into the error.
