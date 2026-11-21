---
title: Aggregate pull request gate unit contract
status: passing
source: packages/cli/tests/traceability/impact-pr-diff.test.ts
tags:
  - cli
  - impact-policy
  - stage-e
  - unit
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-impact-aggregate-gate
      target: default
  success_policy: all_required_first_attempt
id: TEST-cli-impact-aggregate-gate-unit
type: test
origin:
  kind: agent
  recorded_at: '2026-11-10T14:00:00.000Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c148d717aee538dd7289f86d
    test_id: TEST-cli-impact-aggregate-gate-unit
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 6168e97668270898227237b4bdb66c51efd0f8cd7dac27deb837b7e474d85a04
    binding_hash: ec12469d32259a5997809eafb43404d26e9c08de3bdeb65624636ed5fa001b18
    fingerprint: 21e3caec3152995c92627483194165907a0814ab5a7cb3b4fd1b5bec86173e20
    fingerprint_components:
      contract: 6168e97668270898227237b4bdb66c51efd0f8cd7dac27deb837b7e474d85a04
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-unit-test-cli-impact-aggregate-gate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the trusted pull request event resolver and the protected-target diff checks: a unique trusted repository, target ref, base and head; refusal of an advanced protected path; and refusal of a change that edits the impact policy.
