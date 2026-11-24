---
title: kb_search next steps in the structured result tests
status: passing
tags:
  - search
priority: should
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-24T08:38:41.804Z'
id: TEST-kibi-search-next-steps
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-search-next-steps
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fbe5e65abf8042c0487f3936
    test_id: TEST-kibi-search-next-steps
    scope: end_to_end
    outcome: passed
    code_snapshot: f87a5fd261a2459538f2beda6c24f230f66d4a4664cf21b5806296d37aa46c6c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T11:01:51.590Z'
    finished_at: '2026-11-24T11:02:02.582Z'
    artifact_digest: 52b17acd368dabe0dd59aee06529298b12b28327bca3cc71337650a3b036e2a8
    contract_hash: b0a13b9996c49d8087eaeda93ec8c546d839ffa9e16aa77a940a2a281d83643d
    binding_hash: 982f3b634afe86314dce20ced0792cfa653d26944226640cc9b875551a6fc7f7
    fingerprint: e4f78da99bcf9103f45c5b42a17bea18294367b892e31085c85abd2cd09d505c
    fingerprint_components:
      contract: b0a13b9996c49d8087eaeda93ec8c546d839ffa9e16aa77a940a2a281d83643d
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
      - symbol_id: SYM-test-kibi-search-next-steps
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Unit tests drive executeSearch for every branch of the next steps: an abstained search, a weak search with and without a hint shown, a strong search, a later page, a type filter, a file path in the question and a question about contradictions. A parity test runs the same searches over the CLI JSON route and the MCP adapter and compares the results.