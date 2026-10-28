---
title: The predicate schema alignment step code shall be predicate_schema_alignment, by a regex proof
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
    - symbol_id: SYM-proof-predicate-alignment-code
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-plan-predicate-schema-alignment-code
  proves:
    - CLAIM-6EA0FEBFF172026F
origin:
  kind: agent
  recorded_at: '2026-10-28T18:53:59.080Z'
id: TEST-proof-predicate-alignment-code
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee72b140632808b44b82ce4c
    test_id: TEST-proof-predicate-alignment-code
    scope: unit
    outcome: passed
    code_snapshot: 9d5c809154467be6acfd269eb08afb5aca0715b26530e00d26a714dc949a439f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:56:13.629Z'
    finished_at: '2026-10-28T18:56:13.770Z'
    artifact_digest: f2da7ea6e1052e168ead1956b757c7309fa41deb104ea90385411455bebb46e1
    contract_hash: 85ed061e33ca3033f23067bf297733e387c09a052f55bbe71c21922c6a9d1c0b
    binding_hash: d2eb8b2b074df8defec30ece7fd73e6547e29beafcc1f7874d695483e7987dcf
    fingerprint: ba43fb90995d68551e7c36cd0dc691ac21765fa3b4efa6ae33c99bf0a35dd195
    fingerprint_components:
      contract: 85ed061e33ca3033f23067bf297733e387c09a052f55bbe71c21922c6a9d1c0b
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
      - symbol_id: SYM-proof-predicate-alignment-code
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
      test_id: TEST-proof-predicate-alignment-code
      pattern:
        symbol_id: SYM-migration-plan-predicate-schema-alignment-code
        type: string
        value: predicate_schema_alignment
    certificate_digest: 4c9a8af21e2927a22318f4cb1dee616ad01bdd45cc6747df835c90bae8a4f4a6
    claim_bindings:
      - claim_key: CLAIM-6EA0FEBFF172026F
        requirement_id: REQ-agent-migration-plan-codes
        fact_id: FACT-predicate-alignment-code
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: predicate_schema_alignment
---
Proves that the predicate schema alignment step code shall be predicate_schema_alignment, against the code Kibi reads at ingest.