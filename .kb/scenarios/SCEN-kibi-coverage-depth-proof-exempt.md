---
title: A requirement with no test evidence is reviewed for coverage depth unless it is proof-exempt with a reason
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-11T18:00:00.000Z'
id: SCEN-kibi-coverage-depth-proof-exempt
type: scenario
---
Given a fixture KB with REQ-DEPTH-PLAIN and REQ-DEPTH-EXEMPT, neither linked to a test, and REQ-DEPTH-EXEMPT marked proof_exempt with a reason, when the packed CLI runs kibi check, then coverage_depth_review names REQ-DEPTH-PLAIN and not REQ-DEPTH-EXEMPT.

## Context

The proof-exempt side of the coverage depth review, run by the packed check-review-rules E2E test.
