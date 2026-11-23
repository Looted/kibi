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
    - symbol_id: SYM-e2e-telemetry-acceptance-gate
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6227724ef072f73d847205d2
    test_id: TEST-skillopt-paid-launch-accounting
    scope: integration
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: f4d6e27453227177ae299ea9f6f5a714f90be961eabbe1460a8edad88b86187c
    binding_hash: b628815d68b583006c2faf7b37cb211e8b8762fa47ed8487cda7f76fcc17f72f
    fingerprint: 9918469dde898f6c2b5406dce0d5b927db2ec659ba3b30f953b11dbff15588df
    fingerprint_components:
      contract: f4d6e27453227177ae299ea9f6f5a714f90be961eabbe1460a8edad88b86187c
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
      - symbol_id: SYM-e2e-telemetry-acceptance-gate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The model-gateway suites verify exact request-ID attribution under equal request hashes, byte-identical same-request retries, one-use capability replay rejection, approved-pricing binding, pinned CA/TLS/SNI/IP/egress policy, and request, invoice, and authorization ceilings.

The paid-launch receipt suite parses strict debit-subentry, final debit/reconciliation, and final-verdict fixture artifacts, verifies their complete launch bindings and deterministic fixture signatures, and rejects unknown fields, rebound requests, and tampered signatures. The evidence-generator suite proves that serialized evidence is derived from those parser outputs without dropping reconciliation or verdict launch bindings. The authorization-broker suite verifies immutable trust roles and proves that absent external services exit nonzero before process, provider, or ledger activity.
