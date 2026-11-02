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
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-695cac5440f8e3545eab0640
    test_id: TEST-kibi-case-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:49:05.374Z'
    finished_at: '2026-10-30T19:49:16.203Z'
    artifact_digest: 9bc5cef0ea37cd5e054bbb3e7f2895331aebeaf82109571c9e774f9c6b4fdcc6
    contract_hash: 99b8584c2baf4945f47b07913093cdae43b4d38ff789ae51273476e9e7f1c3c8
    binding_hash: f7cc4f59690fc4f9addd43870364c211b95678e0a7346a59410dc0cfe3708fc6
    fingerprint: 878084c68ef26229da69cfb89553026456370e9a1d554a745083a58b6933c9a2
    fingerprint_components:
      contract: 99b8584c2baf4945f47b07913093cdae43b4d38ff789ae51273476e9e7f1c3c8
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
      - symbol_id: SYM-kibi-case-coverage-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Authors an upload-batch requirement bounded at five files in a fresh workspace and checks through the built CLI that the semantic advisor previews its cases, that the value past the bound is an uncovered rejection case giving the uncovered_case gap, that kibi coverage --cases, proof explain and the repair plan's draft scenario name it, that a draft scenario does not cover it while an active rejection scenario assuming six files does, and that a case waiver counts only once approved (packages/cli/tests/consumer/case-coverage.test.ts).
