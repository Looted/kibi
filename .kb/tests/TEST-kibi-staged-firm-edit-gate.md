---
title: Staged firm-edit gate tests
status: passing
priority: must
tags:
  - firmness
  - check
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:42.879Z'
id: TEST-kibi-staged-firm-edit-gate
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-staged-firm-edit-gate
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ccdd20be7432c305db773e99
    test_id: TEST-kibi-staged-firm-edit-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 922722505874a39bf824680c85dc86f0274e2312643033c33145a58404c54cae
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:39:59.733Z'
    finished_at: '2026-11-16T18:40:02.457Z'
    artifact_digest: e86e7b65cce8c950944f85b38f49d3d32ef815f8ca332fa0b7a7747715adece4
    contract_hash: 5829523c75547972bfe0ea850ca7eba9095333dfe47c14215ed406dfba68412c
    binding_hash: 431452ae7db60151d83cacddf824f4f884ac8dec7e422314c5fb3eae50b88f1a
    fingerprint: f67a6e8f7b9197e4e66fe8b2b39e615193f421ecc15c6600715afdac08440163
    fingerprint_components:
      contract: 5829523c75547972bfe0ea850ca7eba9095333dfe47c14215ed406dfba68412c
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
      - symbol_id: SYM-test-kibi-staged-firm-edit-gate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The gate tests build changed symbols, requirements and receipts and check that a staged edit of a symbol implementing a current firm requirement, whatever kind of declaration it is (a function, a constant, an arrow function), yields a blocking firm_edit_unreviewed finding with a ready kibi review-firm-edit input when no current keeps receipt exists, firm_edit_breaks_rule when the receipt says changes, and nothing when a current keeps receipt covers every edited symbol or the requirement is not current, not firm, or restated in the same commit. Lines removed inside a symbol and a removed symbol record count as edits; a note added to the requirement's document does not restate it (packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts, packages/cli/tests/public-mutation/impact/firm-edit-staged.mutation.test.ts). The analyzer tests run the gate on staged and working-tree changes with real receipt files (packages/cli/tests/public-mutation/impact/analyzer.mutation.test.ts), the staged check tests confirm kibi check --staged reports it (packages/cli/tests/commands-mutation/check/staged-results.test.ts), and the real-CLI tests stage removed lines, a removed symbol, a requirement note and partial staging (packages/cli/tests/consumer/firm-edit-review.test.ts).

A false pass would be a gate test that never stages an edit without a receipt, or one that treats a changes receipt as a pass.