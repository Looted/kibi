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
    receipt_id: PR-8cd4a878dda610a3c3973354
    test_id: TEST-proof-step-order
    scope: end_to_end
    outcome: passed
    code_snapshot: 294e115eab197dc60260fd04d6a4ef5772d12152929d4b4722f5688eebee9d4a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T16:18:09.436Z'
    finished_at: '2026-11-12T16:18:10.906Z'
    artifact_digest: 04b0f26f9541b6ff0fc76fb158a98a83c5d1fdd0a298d5751982f1c5bd613ca0
    contract_hash: 464fd608ccc89f2bf8e9916763de2f140422b21ff92bdf7c5a6dc72275adb70a
    binding_hash: 552cb454c6108cd86edc97cdf0effc49552e00e27332536a1e972cef45c24262
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
