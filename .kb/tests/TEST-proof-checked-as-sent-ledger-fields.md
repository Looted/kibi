---
title: The ledger fields that make a kb_upsert be checked as sent, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-checked-as-sent-ledger-fields
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-const-ledger-contract-fields
  proves:
    - CLAIM-5519F3DAE9238E3D
origin:
  kind: agent
  recorded_at: '2026-11-16T11:03:11.951Z'
id: TEST-proof-checked-as-sent-ledger-fields
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1ec36c2c73e175fb10f701e8
    test_id: TEST-proof-checked-as-sent-ledger-fields
    scope: unit
    outcome: passed
    code_snapshot: ff80bceaa93f4842726b3847badf0fad45cabb71bca1029d8620d426a2ea69ee
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T17:49:40.884Z'
    finished_at: '2026-11-17T17:49:43.700Z'
    artifact_digest: fdf2090c82a3b9cd59006eb35daa76ec4527cf28f9888c3be5e92da35f136be7
    contract_hash: 0cd99172c8c37e163c793bd029a00e99bedc2f6dc17c61aefc8aec80b60daa57
    binding_hash: a553c521bf1d99906e5ba89324329a6982176c761c09d74951e4e571690d019d
    fingerprint: 8778e82f8ebad3205337fe884dad64db86f5bf28bbd0ba9de425e1bd7fd0c579
    fingerprint_components:
      contract: 0cd99172c8c37e163c793bd029a00e99bedc2f6dc17c61aefc8aec80b60daa57
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
      - symbol_id: SYM-proof-checked-as-sent-ledger-fields
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-checked-as-sent-ledger-fields
      domain:
        symbol_id: SYM-const-ledger-contract-fields
        members:
          - semantic_inventory_version
          - semantic_source_field
          - semantic_source_hash
          - logic_claims
      results:
        - member: semantic_inventory_version
          outcome: passed
        - member: semantic_source_field
          outcome: passed
        - member: semantic_source_hash
          outcome: passed
        - member: logic_claims
          outcome: passed
    certificate_digest: 5f1f69d7b75f7d5ed90948fa66fd3120f6acf76e113e467857e209a60b8d4c2b
    claim_bindings:
      - claim_key: CLAIM-5519F3DAE9238E3D
        requirement_id: REQ-kb-upsert-derives-proposition-ledger
        fact_id: FACT-kb-upsert-checked-as-sent-fields
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - logic_claims
            - semantic_inventory_version
            - semantic_source_field
            - semantic_source_hash
---
Proves that the ledger fields whose presence makes a kb_upsert be checked as sent are exactly semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims, against the code Kibi reads at ingest.