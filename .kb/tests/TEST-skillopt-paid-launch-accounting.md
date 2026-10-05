---
id: TEST-skillopt-paid-launch-accounting
title: Paid-launch gateway and receipt contracts reject attribution and
  trust-boundary violations
type: test
status: passing
created_at: 2026-07-26T00:00:00.000Z
updated_at: 2026-07-26T00:00:00.000Z
source: scripts/skillopt-eval/tests/model-gateway-security.test.ts
priority: must
tags:
  - skillopt
  - paid-launch
  - integration
  - security
  - accounting
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: REQ-skillopt-paid-launch-accounting
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-paid-launch-accounting
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-167860b7f0fc04fc47e2c326
    test_id: TEST-skillopt-paid-launch-accounting
    scope: integration
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 810b6374f2a76c2c74f29906eda2835317f5fc9ef271cd84697bf77daa23d2ab
    binding_hash: bac03d322a777d8dada0d31c8a88cf251bb64232a537cf8dee007f5f05e94466
    fingerprint: a8a972ce00cf9a0129592f57ab1583ed4b1799c04064b7899ac15f6ec9f19826
    fingerprint_components:
      contract: 810b6374f2a76c2c74f29906eda2835317f5fc9ef271cd84697bf77daa23d2ab
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
      - symbol_id: SYM-e2e-test-skillopt-paid-launch-accounting
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The model-gateway suites verify exact request-ID attribution under equal request hashes, byte-identical same-request retries, one-use capability replay rejection, approved-pricing binding, pinned CA/TLS/SNI/IP/egress policy, and request, invoice, and authorization ceilings.

The paid-launch receipt suite parses strict debit-subentry, final debit/reconciliation, and final-verdict fixture artifacts, verifies their complete launch bindings and deterministic fixture signatures, and rejects unknown fields, rebound requests, and tampered signatures. The evidence-generator suite proves that serialized evidence is derived from those parser outputs without dropping reconciliation or verdict launch bindings. The authorization-broker suite verifies immutable trust roles and proves that absent external services exit nonzero before process, provider, or ledger activity.
