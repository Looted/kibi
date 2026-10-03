---
title: Search answer layer and intent-search ranking unit tests
status: passing
verification_scope: unit
verification_perspective: internal
tags:
  - search
  - intent-search
  - answer-layer
  - discovery
id: TEST-kibi-search-answer-layer
type: test
---
# Search answer layer and intent-search ranking unit tests

Runs `packages/cli/tests/search-answer.test.ts` and `packages/cli/tests/intent-search.test.ts` (exercises `packages/cli/src/search-answer.ts`, `packages/cli/src/intent-search.ts` and the kb_search executor in `packages/cli/src/public/operations/discovery-executors.ts`).
