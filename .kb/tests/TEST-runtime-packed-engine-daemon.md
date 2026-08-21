---
title: Packed runtime engine daemon consumer proof
status: open
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-runtime-packed-engine-daemon
  required_case_symbols:
    - SYM-test-runtime-engine-daemon
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
---
