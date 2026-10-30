---
title: Consumer CLI blocks tested until a scenario covers the value past a bound or a case waiver is approved
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:00.000Z'
id: TEST-kibi-case-coverage
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-case-coverage-verifier
      target: default
  success_policy: all_required_first_attempt
---
Authors an upload-batch requirement bounded at five files in a fresh workspace and checks through the built CLI that the semantic advisor previews its cases, that the value past the bound is an uncovered rejection case giving the uncovered_case gap, that kibi coverage --cases, proof explain and the repair plan's draft scenario name it, that a draft scenario does not cover it while an active rejection scenario assuming six files does, and that a case waiver counts only once approved (packages/cli/tests/consumer/case-coverage.test.ts).
