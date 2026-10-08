---
title: Bootstrap shared subject fact tests
status: active
priority: must
tags:
  - bootstrap
  - modeling
  - naming
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-bootstrap-subject-fact-shared
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-08T15:34:28.648Z'
id: TEST-bootstrap-subject-fact-shared
type: test
---
Runs `packages/cli/tests/consumer/bootstrap-write-failures.test.ts` through the real CLI and Prolog engine: two declared sources with claims about the same subject plan one subject fact with two `constrains` links and a `subject-key-shared:` diagnostic, replan to the same hash, apply, and pass `kb_check` without `subject-key-identity`; the other bootstrap write cases in the file keep passing with the shared fact.