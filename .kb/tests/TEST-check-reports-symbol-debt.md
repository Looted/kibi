---
title: The full check reports symbol debt and exempts linkless non-behavioral records
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
    receipt_id: PR-aead79ba95947d73766749bc
    test_id: TEST-check-reports-symbol-debt
    scope: end_to_end
    outcome: passed
    code_snapshot: 5434da306c269b06f3ab3332686aeca47fd3a0e8a998befaf06388d5c53900c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:16:43.780Z'
    finished_at: '2026-11-16T12:18:17.305Z'
    artifact_digest: 18bc221c84bfdef0fd1b2db61bbc5f731cb456e0414e714a9ab13a65d1fd8b0f
    contract_hash: 213ba1df2b7e8e432243f5a60abe2ad0cb478d462447d4f9f499211d4ccb9142
    binding_hash: bb8b962121a5bd245b22b5a59fddc8eb8822acda1cc08ae29674d7aad55eb04f
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
Packed end-to-end test documentation/tests/e2e/packed/check-symbol-debt.test.ts: in an installed project it checks that an unscoped kibi check reports the unrecorded declarations of a recorded file per file and as a total in JSON symbolDebt and in text, without a violation, that a rule-scoped check carries no debt, that a config record with no implements link raises neither symbol-traceability nor symbol-coverage while a behavioral one is flagged, and that the installed kibi-bootstrap skill states the staged symbol rule and reports the debt total.