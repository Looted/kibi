---
title: The search answer layer leaves provenance stubs out of its notes
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:45.186Z'
id: SCEN-NEG-bootstrap-provenance-stubs-STUB-AS-NOTE
type: scenario
---
Given search results that include a fact tagged bootstrap:provenance-stub, when the answer layer builds its notes, then the stub is not listed among them.

This is the failure side of provenance stubs: a claimless stub must not be presented to a reader as knowledge. packages/cli/tests/search-provenance-stubs.test.ts "the answer layer does not list a stub among its notes" exercises it.
