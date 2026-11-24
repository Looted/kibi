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
    receipt_id: PR-1448f9a042fd6fce856f6207
    test_id: TEST-kibi-search-next-steps
    scope: end_to_end
    outcome: passed
    code_snapshot: 4f27e9b2b2c7cf29e22be49a1789910470c7432fa60042ba1eb9cb152985fa6a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-24T19:32:52.655Z'
    finished_at: '2026-11-24T19:33:09.096Z'
    artifact_digest: 12083251bad8eb5ddde62cc01bbe81888de1be4e0a38967b52b7f7a4b869fba7
    contract_hash: b0a13b9996c49d8087eaeda93ec8c546d839ffa9e16aa77a940a2a281d83643d
    binding_hash: 20168382359af52a9e7d474967e01f52fe134fde9ab68e489b300ca0ac3f3780
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