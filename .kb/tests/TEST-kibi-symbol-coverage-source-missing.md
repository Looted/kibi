---
title: Symbol coverage reports a linked symbol as uncovered once its source file is deleted
status: pending
priority: must
tags:
  - coverage
  - symbols
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-symbol-coverage-source-missing
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-15T09:00:00.000Z'
id: TEST-kibi-symbol-coverage-source-missing
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a7e2244ff497b7f9abd622cc
    test_id: TEST-kibi-symbol-coverage-source-missing
    scope: end_to_end
    outcome: passed
    code_snapshot: 33f636c58d6617f132fa3c7973ec773e39a06538e87ae713cda714c3ef347e78
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T10:59:48.285Z'
    finished_at: '2026-11-15T11:01:04.475Z'
    artifact_digest: de7af4e800691dfe85bca363ca371b1dca96bdcc54df69b8e709b5f2f292c91f
    contract_hash: 453c415220b8a38ba2b9a46f292196b13ba09759a3c164036b22e71e2973acca
    binding_hash: ca427450f2c3a2d5a02ab9bb64e59254903e5898b60672323aadbbdf3b9a1c68
    fingerprint: 7d098cf2cc167428e10b1307aff314d94447d99c920739739dfa38c67edc6f7a
    fingerprint_components:
      contract: 453c415220b8a38ba2b9a46f292196b13ba09759a3c164036b22e71e2973acca
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
      - symbol_id: SYM-e2e-test-kibi-symbol-coverage-source-missing
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Packed end-to-end test documentation/tests/e2e/packed/symbol-coverage-missing-source.test.ts: in an installed project it syncs two linked symbols, deletes one symbol's source file, and checks that `kibi coverage --by symbol` reports that symbol as uncovered with the source_missing gap while the other stays fully covered.