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
    receipt_id: PR-66f3e8a2eabb47f251a6b77c
    test_id: TEST-proof-source-path-rewrite-action
    scope: unit
    outcome: passed
    code_snapshot: 4b699c9b07afd709892fdd2513cb5f73a7167d1881b1a2daf6c70078e8f98147
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:31:02.817Z'
    finished_at: '2026-10-28T17:31:02.963Z'
    artifact_digest: f5ccc68c4110d57c2b6d933e1533bb2a3928922062741c562fc94e47f5466e86
    contract_hash: 964275352df194f0567bed7eb7405028689cda4681b131742fcab62c7043da3d
    binding_hash: ab16ef66a9fcdb4fa35eff23b3e2e2244584feb05cede5c4c1383135e7e4a07e
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
        requirement_id: REQ-kibi-lifecycle-check-codes
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