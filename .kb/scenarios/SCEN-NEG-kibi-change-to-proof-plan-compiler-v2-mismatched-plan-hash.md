---
title: Applying a compiled plan with a mismatched plan hash is rejected
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:07:29.345Z'
id: SCEN-NEG-kibi-change-to-proof-plan-compiler-v2-mismatched-plan-hash
type: scenario
---
Given a plan compiled by the packed CLI with its canonical sha-256 plan hash, when apply-plan is called with an approved hash that does not match it, then the application is rejected with a non-zero exit and an error that names the hash mismatch, and nothing is applied.

This is the failure side of hash-bound plan application: a caller must apply exactly the plan it reviewed, never an edited or different one. documentation/tests/e2e/packed/cli-plan-compiler-hash.test.ts "compiles a hash-bound plan and rejects a mismatched apply request" exercises it.
