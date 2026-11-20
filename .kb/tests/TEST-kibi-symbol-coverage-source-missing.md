---
title: Symbol coverage reports a linked symbol as uncovered once its source file is deleted
status: passing
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
    receipt_id: PR-507e003bac174b590c2c9494
    test_id: TEST-kibi-symbol-coverage-source-missing
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 453c415220b8a38ba2b9a46f292196b13ba09759a3c164036b22e71e2973acca
    binding_hash: 19acb45ecf7d7f66b1b9ee19f43395dc82de0040bab9833b5020d65fab287fc7
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