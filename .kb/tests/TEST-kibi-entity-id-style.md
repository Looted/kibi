---
title: Entity ID style helper, staged review, and compile-intent slug IDs
status: passing
verification_scope: unit
tags:
  - vocabulary-convergence
id: TEST-kibi-entity-id-style
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This covers the helper, staged review of added and renamed files, and compile-intent accepting a slug ID. Compile-intent ignored a caller's ID before this PR, which blocked slug naming through that route.
