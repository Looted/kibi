---
id: TEST-kibi-change-to-proof-evaluation
title: Change-to-proof evaluation harness
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-evaluation.md
priority: should
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - evaluation
  - search
  - planning
  - dogfood
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-evaluation
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-change-to-proof-evaluation
  required_case_symbols:
    - SYM-test-kibi-change-to-proof-evaluation
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
---

The evaluator reads versioned JSONL gold fixtures and emits deterministic JSON with per-case matches, clause dispositions, abstentions, and aggregate scores. It fails closed when an expected result is missing or when a proof claim lacks the required evidence path.
