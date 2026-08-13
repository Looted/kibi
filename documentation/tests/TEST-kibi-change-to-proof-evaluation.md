---
id: TEST-kibi-change-to-proof-evaluation
title: Change-to-proof evaluation harness
type: test
status: passing
created_at: 2026-08-13T00:00:00Z
updated_at: 2026-08-13T00:00:00Z
source: documentation/tests/TEST-kibi-change-to-proof-evaluation.md
priority: should
verification_scope: integration
verification_perspective: consumer
tags: [evaluation, search, planning, dogfood, test]
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-evaluation
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
