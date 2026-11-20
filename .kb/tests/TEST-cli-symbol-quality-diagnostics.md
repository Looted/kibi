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
    receipt_id: PR-101405b420a61775ce030381
    test_id: TEST-cli-symbol-quality-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
