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
    receipt_id: PR-b031da16bb67d5472a3f53dd
    test_id: TEST-skillopt-paid-launch-accounting
    scope: integration
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
