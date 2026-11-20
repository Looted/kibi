---
title: The full check counts symbol debt on a one-line pass, lists it on request, and exempts linkless non-behavioral records
status: passing
priority: must
tags:
  - symbols
  - check
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-check-reports-symbol-debt
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: TEST-check-reports-symbol-debt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fd273e7a317a3d993e9323fe
    test_id: TEST-check-reports-symbol-debt
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 213ba1df2b7e8e432243f5a60abe2ad0cb478d462447d4f9f499211d4ccb9142
    binding_hash: ca26afd881ea273c1aced0e346b1072495b45608addc5e7eb9dc5ac41f1e78b7
    fingerprint: cffbffa2c2ab0aa99686b627fb5184e2396dff68bee662c7f2ed7616030521d5
    fingerprint_components:
      contract: 213ba1df2b7e8e432243f5a60abe2ad0cb478d462447d4f9f499211d4ccb9142
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
      - symbol_id: SYM-e2e-test-check-reports-symbol-debt
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/check-symbol-debt.test.ts: in an installed project it checks that an unscoped kibi check passes with one verdict line giving the rule count and the unrecorded declarations of a recorded file as a count, that JSON symbolDebt carries total and fileCount and lists the declarations per file only with --symbol-debt or kb_check includeSymbolDebt:true, that kb_check gives evaluated.ruleCount without rule names, that a rule-scoped check carries no debt, that a config record with no implements link raises neither symbol-traceability nor symbol-coverage while a behavioral one is flagged, and that the installed kibi-bootstrap skill states the staged symbol rule and reports the debt total.