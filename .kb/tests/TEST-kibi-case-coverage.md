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
    receipt_id: PR-434f6e619d73ee4c327bad90
    test_id: TEST-kibi-case-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 99b8584c2baf4945f47b07913093cdae43b4d38ff789ae51273476e9e7f1c3c8
    binding_hash: fb7de8e3798110d92afc9e7ce3033180c0780cc20c4996e76330e5b6fb01693d
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
