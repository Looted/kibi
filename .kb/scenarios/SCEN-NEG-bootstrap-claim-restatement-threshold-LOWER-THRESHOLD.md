---
title: An intent claim just below token overlap 0.8 is not flagged as a close restatement, while one at 0.8 is
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T22:10:51.368Z'
id: SCEN-NEG-bootstrap-claim-restatement-threshold-LOWER-THRESHOLD
type: scenario
---
Given a current requirement whose first sentence has nine tokens, when bootstrap plans one declared intent claim sharing seven of them (token overlap 0.78) and another sharing eight of ten (overlap 0.8), then the first is planned with no possible_restatement signal and no closely restates diagnostic, and only the second is flagged as a close restatement of the requirement.

This is the failure side of the 0.8 threshold: a claim on the wrong side of the bound must not be called a restatement, and one on the bound must be. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "the restatement signal starts at token overlap 0.8 and not below it" exercises it.
