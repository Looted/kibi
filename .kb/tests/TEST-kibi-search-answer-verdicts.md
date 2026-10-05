---
title: Search answers carry check verdicts, approved exceptions, unknowns, ADR excerpts and the snapshot scope within the byte ceiling
status: passing
tags:
  - search
  - answer-layer
  - discovery
  - verdicts
  - exceptions
verification_scope: integration
verification_perspective: internal
text_ref: packages/cli/tests/search-answer.test.ts; packages/cli/tests/consumer/search-answer-layer.test.ts; packages/core/tests/kb.plt
origin:
  kind: agent
  recorded_at: '2026-10-04T02:34:48.165Z'
id: TEST-kibi-search-answer-verdicts
type: test
---
# Search answers carry check verdicts, approved exceptions, unknowns, ADR excerpts and the snapshot scope within the byte ceiling

Runs the `search answer verdicts, exceptions and scope`, `search answer rationale excerpts`, `ADR excerpts` and `search answer byte ceiling` blocks of `packages/cli/tests/search-answer.test.ts` (verdict `none` with the snapshot scope when no check names a requirement; contradiction and infeasibility witnesses set the verdict and unknowns are listed; a verdict the engine cannot compute leaves the answer standing as `unknown`; exempting requirements are listed with their approver; ADR rationale carries its source and decision excerpt; excerpts are dropped before any governing requirement and a verdict keeps its status when its witnesses are dropped) and the consumer tests `reports the checks' verdict, approved exceptions and the snapshot the answer came from` and `names the conflicting requirement and the clauses the checks could not ground` in `packages/cli/tests/consumer/search-answer-layer.test.ts`, with the `discovery:search_answer_verdicts_json/2` units in `packages/core/tests/kb.plt`.
