---
id: TEST-cli-symbol-quality-diagnostics
title: CLI symbol quality diagnostic tests
status: passing
source: packages/cli/tests/traceability/impact-symbol-quality.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-symbol-quality-diagnostics
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
    receipt_id: PR-7da8a42d10259b0ed008bfbe
    test_id: TEST-cli-symbol-quality-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: c78d87453534f34be23060678a90114386641b97f24f1f909f008a3c1ad06ae5
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:28:06.298Z'
    finished_at: '2026-10-25T12:28:06.465Z'
    artifact_digest: 930bed4632b80aefbb0489bee95f51ccb218d1450b3530bc662e8d0a8b798aa7
    contract_hash: 7d377983cec62922451e6282c96d416a493e3a8b5edb0fcbcd336bcefc2c31e8
    binding_hash: b151a07a457b7e960ffbabdaf87b6d7e992a57c06ff15822e0f518056d7d9fde
    fingerprint: a47eab8a379d6af3684921317a90d220eb14a1d32283174d3fb7cfaf0a07d768
    fingerprint_components:
      contract: 7d377983cec62922451e6282c96d416a493e3a8b5edb0fcbcd336bcefc2c31e8
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
      - symbol_id: SYM-unit-test-cli-symbol-quality-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Validates multi-requirement symbol and duplicate-coordinate review diagnostics.
