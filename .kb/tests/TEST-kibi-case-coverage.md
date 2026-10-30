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
    receipt_id: PR-8737c3d4217a9a06b332c118
    test_id: TEST-kibi-case-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: af0ee6013066aa0e937f5ea604395939dc7ad5cda0ac7ead4237930e7dfa9077
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T14:09:52.294Z'
    finished_at: '2026-10-30T14:10:06.117Z'
    artifact_digest: 5640c49aced427f81888dab28748947827d850c17a723b44c679a6a4cf06abf1
    contract_hash: 99b8584c2baf4945f47b07913093cdae43b4d38ff789ae51273476e9e7f1c3c8
    binding_hash: 0e56810bce6ae0794438f3fa5d8d6c1bd73520b85c381ad24a06f609b86bdfd4
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
