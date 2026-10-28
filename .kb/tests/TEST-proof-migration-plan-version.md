---
title: The guided migration plan version shall be kibi.migration-plan.v2, by a regex proof
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
    - symbol_id: SYM-proof-migration-plan-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-kibi-migration-plan-version
  proves:
    - CLAIM-00012BE9F8DC0BFA
origin:
  kind: agent
  recorded_at: '2026-10-28T18:53:39.598Z'
id: TEST-proof-migration-plan-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1568106156ce7ee17d8ec9f1
    test_id: TEST-proof-migration-plan-version
    scope: unit
    outcome: passed
    code_snapshot: 9d5c809154467be6acfd269eb08afb5aca0715b26530e00d26a714dc949a439f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:56:07.806Z'
    finished_at: '2026-10-28T18:56:07.950Z'
    artifact_digest: ab15d60daa2fd68644ea415bc8b21bc64c86db5202b505110f4eea867f54a025
    contract_hash: a65d676d6585cfe8b0b44abe6e0bc054228ce66205bb88f0a75978f1d8e0b2f7
    binding_hash: 4c5cd2473161617b7792f151163c7bf58d33cb56871bd760f01362da022c07b4
    fingerprint: 45713297238a29b2d24e7c53121776f9b6b55c8bdfb088559a5281007ef3d180
    fingerprint_components:
      contract: a65d676d6585cfe8b0b44abe6e0bc054228ce66205bb88f0a75978f1d8e0b2f7
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
      - symbol_id: SYM-proof-migration-plan-version
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
      test_id: TEST-proof-migration-plan-version
      pattern:
        symbol_id: SYM-kibi-migration-plan-version
        type: string
        value: kibi.migration-plan.v2
    certificate_digest: b9df7a1f55d3e5072ec98d87d7d503c226b9c15f2b08329ba1c825d33184e9f2
    claim_bindings:
      - claim_key: CLAIM-00012BE9F8DC0BFA
        requirement_id: REQ-agent-migration-plan-codes
        fact_id: FACT-migration-plan-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.migration-plan.v2
---
Proves that the guided migration plan version shall be kibi.migration-plan.v2, against the code Kibi reads at ingest.