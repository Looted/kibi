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
    receipt_id: PR-7390c4741d439c71ff858816
    test_id: TEST-kibi-symbol-coverage-source-missing
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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