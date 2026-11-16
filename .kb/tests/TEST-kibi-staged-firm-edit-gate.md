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
    receipt_id: PR-543c54080f23c0317ec1617d
    test_id: TEST-kibi-staged-firm-edit-gate
    scope: end_to_end
    outcome: passed
    code_snapshot: 97a1f8ae8b5497330ab28e93a9d81f8e7d9ff5ea036c1beb3794253bf0b278cb
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T08:16:55.399Z'
    finished_at: '2026-11-16T08:16:57.792Z'
    artifact_digest: 773ee514953f987a4f9e5c791edeb3a62b5ca74983228c4088d9329d70092c5f
    contract_hash: 5829523c75547972bfe0ea850ca7eba9095333dfe47c14215ed406dfba68412c
    binding_hash: 678ebae0e028327105092531f6482dca803f01513016683bfcaf350d191506a6
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
The gate tests build changed symbols, requirements and receipts and check that a staged edit of a behavioral symbol implementing a current firm requirement yields a blocking firm_edit_unreviewed finding with a ready kibi review-firm-edit input when no current keeps receipt exists, firm_edit_breaks_rule when the receipt says changes, and nothing when a current keeps receipt covers every edited symbol or the requirement is not current, not firm, or changed in the same commit (packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts). The analyzer tests run the gate on staged and working-tree changes with real receipt files (packages/cli/tests/public-mutation/impact/analyzer.mutation.test.ts), and the staged check tests confirm kibi check --staged reports it (packages/cli/tests/commands-mutation/check/staged-results.test.ts).

A false pass would be a gate test that never stages an edit without a receipt, or one that treats a changes receipt as a pass.