---
title: Packed CLI GitHub report workflow and badge E2E
status: active
tags:
  - cli
  - github
  - report
  - badge
  - init
  - e2e
text_ref: documentation/tests/e2e/packed/github-report-integration.test.ts
verification_scope: end_to_end
verification_perspective: consumer
verification_contract:
  version: kibi.verification-contract.v1
  runner: node
  command_argv:
    - node
    - scripts/run-proof-contract.mjs
    - '--test-id'
    - TEST-kibi-github-report-e2e
  required_case_symbols:
    - SYM-e2e-packed-cli-github-report
  required_projects:
    - default
  success_policy: all_required_cases_first_attempt
id: TEST-kibi-github-report-e2e
type: test
---
