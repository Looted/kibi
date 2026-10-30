---
title: A claim that restates a current requirement is not planned again
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:07.445Z'
id: SCEN-NEG-bootstrap-claim-restatement-RESTATED-REQUIREMENT
type: scenario
---
Given a current requirement and a declared intent claim equal to one sentence of its semantic text apart from case and punctuation, when the bootstrap planner runs, then the claim is suppressed as entity_exists, matched to that requirement by restatement, and only the unrelated claim is planned.

This is the failure side of restatement accounting: bootstrap must not write a duplicate of a requirement already in the knowledge base. packages/cli/tests/operations/bootstrap-intent-claims.test.ts "a claim equal to a sentence of a requirement, case and punctuation aside, is counted as that requirement" exercises it.
