---
id: TEST-cli-requirement-quality-diagnostics
title: CLI requirement quality diagnostic tests
status: passing
source: packages/cli/tests/traceability/impact-requirement-quality.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-requirement-quality-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
tags:
  - review:context-missing
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5b8ace293cf1c62e8889138b
    test_id: TEST-cli-requirement-quality-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:28:00.810Z'
    finished_at: '2026-10-25T12:28:00.962Z'
    artifact_digest: 088bfb2fa8f0628ada4961f90058cf443f94c72ebd39aca9b6c450b3704eb778
    contract_hash: d54c1c2df053d89c8f5eeebebca4715be99fc45545fb4bf72e59bcc340f121e4
    binding_hash: cdce54d1db0657e83cbb557903c90d18d6bc1468389160d1173daad705a93f37
    fingerprint: 81087035b7003189440355d78c878e203c11cf26c100b34631945834f8530535
    fingerprint_components:
      contract: d54c1c2df053d89c8f5eeebebca4715be99fc45545fb4bf72e59bcc340f121e4
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
      - symbol_id: SYM-unit-test-cli-requirement-quality-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Validates broad requirement, requirement-status, and strict-fact modeling review diagnostics.
