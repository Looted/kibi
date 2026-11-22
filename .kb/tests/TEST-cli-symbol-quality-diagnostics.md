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
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-98d1441fae0ac3af5f00ee27
    test_id: TEST-cli-symbol-quality-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 7d377983cec62922451e6282c96d416a493e3a8b5edb0fcbcd336bcefc2c31e8
    binding_hash: 2aaa21f6a20bda2be49efcd54fd994e793baf8bde644c99aa20b2707f4a5b691
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

## Context
This checks the symbol-side advisories: one symbol owning many requirements, and duplicate coordinates.
