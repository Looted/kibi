---
title: The source path rewrite code shall be source_path_rewrite, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-source-path-rewrite-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REWRITE_CODE
  proves:
    - CLAIM-831D86A6F95FE733
origin:
  kind: agent
  recorded_at: '2026-10-28T17:28:32.811Z'
id: TEST-proof-source-path-rewrite-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-89024e9374d35fba60a5c8d8
    test_id: TEST-proof-source-path-rewrite-code
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 0f4035ff1549f2e6a74ae6101cf414ea26e32ad12dfdb157c4f9a9f09a7dd786
    binding_hash: da49333e93111e1d2edc2bea30e35aa724bd085dd36d9f518bb857922fb6cbf3
    fingerprint: 9c6fc18b783241ab572fd81cf1ef69fa2f2a56343288f685855789e4c192dc0f
    fingerprint_components:
      contract: 0f4035ff1549f2e6a74ae6101cf414ea26e32ad12dfdb157c4f9a9f09a7dd786
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
      - symbol_id: SYM-proof-source-path-rewrite-code
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-source-path-rewrite-code
      pattern:
        symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REWRITE_CODE
        type: string
        value: source_path_rewrite
    certificate_digest: 96d14ceed8bd521386907b9ba3cec11ca8d967f9b2a62b1482ecf564ea04ee7d
    claim_bindings:
      - claim_key: CLAIM-831D86A6F95FE733
        requirement_id: REQ-kibi-source-path-codes
        fact_id: FACT-source-path-rewrite-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: source_path_rewrite
---
Proves that the source path rewrite code shall be source_path_rewrite, against the code Kibi reads at ingest.