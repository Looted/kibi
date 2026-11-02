---
title: The search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23, by a regex proof
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
    - symbol_id: SYM-proof-search-hints-model-revision
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-1B88D98CB3D0A5CB
  pattern_source:
    symbol_id: SYM-const-search-hints-model-revision
origin:
  kind: agent
  recorded_at: '2026-10-30T19:40:32.148Z'
id: TEST-proof-search-hints-model-revision
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2ace79489aa806d6f8c56ab7
    test_id: TEST-proof-search-hints-model-revision
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:33.887Z'
    finished_at: '2026-10-30T19:45:34.002Z'
    artifact_digest: d5dd75effff018452920695de0448bf47f9eb692bf16b876f00c252e1864c3eb
    contract_hash: f8ffe04f1d519a2c2c4158d0843062a0515844c2c8c0e2b68116fc60e561b2a0
    binding_hash: fcb84f3fbf73c4280e3bfd2fca59567c8656b2131a4110c48d938ac081e82d50
    fingerprint: 8c9a711def2d3e0da3e6014b08835548fe97e3ed8a98de48989bd34097a3a620
    fingerprint_components:
      contract: f8ffe04f1d519a2c2c4158d0843062a0515844c2c8c0e2b68116fc60e561b2a0
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
      - symbol_id: SYM-proof-search-hints-model-revision
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
      test_id: TEST-proof-search-hints-model-revision
      pattern:
        symbol_id: SYM-const-search-hints-model-revision
        type: string
        value: bf8b056651a2c21b8d2565580b8569da283cab23
    certificate_digest: 87019b863df411a858baf49866909c63d614f194bdfab3a6d3aafaf9ff601405
    claim_bindings:
      - claim_key: CLAIM-1B88D98CB3D0A5CB
        requirement_id: REQ-search-hints-model-pin
        fact_id: FACT-search-hints-model-revision
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: bf8b056651a2c21b8d2565580b8569da283cab23
---
Proves that the search hints embedding model revision shall be bf8b056651a2c21b8d2565580b8569da283cab23, against the code Kibi reads at ingest.