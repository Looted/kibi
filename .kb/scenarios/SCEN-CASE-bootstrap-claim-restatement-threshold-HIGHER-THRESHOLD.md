---
title: A claim whose token overlap is exactly 0.8 is still flagged as a close restatement
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:11.822Z'
id: SCEN-CASE-bootstrap-claim-restatement-threshold-HIGHER-THRESHOLD
type: scenario
---
Given a current requirement whose first sentence shares eight of ten distinct tokens with a declared intent claim, when bootstrap plans the claim, then it is flagged as a possible restatement with a token overlap 0.8 diagnostic, so a threshold above 0.8 that would let it through is caught.

This covers the value past the bound, `gt 0.8` on `near_restatement_jaccard`. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "the restatement signal starts at token overlap 0.8 and not below it" exercises it by asserting the claim at overlap exactly 0.8 carries the possible_restatement signal.
