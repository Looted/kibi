---
title: The source path rewrite action id shall be source-path-rewrite, by a regex proof
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
    - symbol_id: SYM-proof-source-path-rewrite-action
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REWRITE_ACTION_ID
  proves:
    - CLAIM-9FCD149FC09937EF
origin:
  kind: agent
  recorded_at: '2026-10-28T17:28:12.295Z'
id: TEST-proof-source-path-rewrite-action
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8805d0f166c9d1cb5a176b07
    test_id: TEST-proof-source-path-rewrite-action
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 964275352df194f0567bed7eb7405028689cda4681b131742fcab62c7043da3d
    binding_hash: 5c159166547dd6f7337896d99c843645ba881fc9482c028920edd03ddf280ab3
    fingerprint: 2dc29a9d60fadaca0a48d410ed63b802448a345cf360e233e1ade27a3cbd5093
    fingerprint_components:
      contract: 964275352df194f0567bed7eb7405028689cda4681b131742fcab62c7043da3d
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
      - symbol_id: SYM-proof-source-path-rewrite-action
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
      test_id: TEST-proof-source-path-rewrite-action
      pattern:
        symbol_id: SYM-schema6-check-actions-SOURCE_PATH_REWRITE_ACTION_ID
        type: string
        value: source-path-rewrite
    certificate_digest: 2ebd204d80ed57f04c0c4bfe386f2871a151f9f68015a424d5a1eb8058179fc1
    claim_bindings:
      - claim_key: CLAIM-9FCD149FC09937EF
        requirement_id: REQ-kibi-source-path-codes
        fact_id: FACT-source-path-rewrite-action
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: source-path-rewrite
---
Proves that the source path rewrite action id shall be source-path-rewrite, against the code Kibi reads at ingest.