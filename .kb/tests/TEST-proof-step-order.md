---
title: The proof producer runs a contract's steps in their declared order
status: passing
priority: must
tags:
  - unit
  - integration
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-proof-step-order
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: Post-release review of Kibi 2026.11.2, 2026-11-12
  recorded_at: '2026-11-12T16:20:00.000Z'
id: TEST-proof-step-order
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8ec20732b2374102fe750197
    test_id: TEST-proof-step-order
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 464fd608ccc89f2bf8e9916763de2f140422b21ff92bdf7c5a6dc72275adb70a
    binding_hash: 3982bf5998b8999cc86e8540b5b64a02dce068bf266d98e3edc9cc8f3087eed7
    fingerprint: 757059ec99f7210c46a14444da0aa5234f2f5f7fa1b0806ed888b0521e90848d
    fingerprint_components:
      contract: 464fd608ccc89f2bf8e9916763de2f140422b21ff92bdf7c5a6dc72275adb70a
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
      - symbol_id: SYM-test-proof-step-order
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
`scripts/tests/run-proof-producer.test.mjs` asserts that `orderProofGroups` places each step after the earlier steps of its contract and lists them as the steps it waits for, keeps the preferred order otherwise, and breaks a cycle between contracts that order the same commands both ways at the preferred step. It would pass falsely if the preferred order already put each contract's steps in order, so the fixture prefers the later steps first.

Integration: a second case runs `runProofProducer` with a step pool of three on a contract with a build step and a step that uses it, records which steps are running when each one starts, and asserts the using step never starts while the build runs and an unrelated contract's step still overlaps it.
