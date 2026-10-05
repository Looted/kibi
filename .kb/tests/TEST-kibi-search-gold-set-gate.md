---
title: The repository search gate scores the gold set, warms the engine first and fails closed on a missed threshold
status: passing
tags:
  - evaluation
  - search
  - gold-set
  - ci
  - latency
verification_scope: unit
verification_perspective: internal
text_ref: scripts/tests/change-to-proof-eval.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:40:05.866Z'
id: TEST-kibi-search-gold-set-gate
type: test
---
# The repository search gate scores the gold set, warms the engine first and fails closed on a missed threshold

Runs the `repository KB search evaluation` block of `scripts/tests/change-to-proof-eval.test.ts`: recall@3, superseded-result rate, abstention precision and recall and warm p50/p95 latency are scored from the CLI envelope; an answer naming no governing requirement is an abstention; every metric that misses its bound is named; the runner restarts the engine, warms it with a question outside the gold set and asks each question once; a question the CLI cannot answer fails the run; and `main --repo-kb` prints the evaluation and fails the gate on a missed threshold.
