---
title: A requirement verified only by unit tests is never reported as tested
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:08:49.461Z'
id: SCEN-NEG-kibi-conservative-requirement-proof-unit-only-chain
type: scenario
---
Given a requirement whose only verification is a unit-scope test with no scenario-backed passing end-to-end test, when the packed CLI reports coverage, then its proofStatus is not tested, and the row lists stable gap codes and ranked repair actions next to the structural coverage fields.

This is the failure side of conservative requirement proof: unit evidence must not be promoted to an end-to-end proof claim. documentation/tests/e2e/packed/coverage-proof-status.test.ts "reports non-proven proofStatus with stable gaps and ranked repairs" exercises it.
