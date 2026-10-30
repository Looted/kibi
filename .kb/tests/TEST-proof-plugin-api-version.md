---
title: The Kibi plugin API version shall be kibi.plugin.v1, by a regex proof
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
    - symbol_id: SYM-proof-plugin-api-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cap-plugin-kibi-plugin-api-version-f5d09d81
  proves:
    - CLAIM-4B5530044039AD39
origin:
  kind: agent
  recorded_at: '2026-10-28T10:48:56.751Z'
id: TEST-proof-plugin-api-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b507fc9a22076ed58cf619cd
    test_id: TEST-proof-plugin-api-version
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:52:09.965Z'
    finished_at: '2026-10-30T19:52:10.060Z'
    artifact_digest: 41ec6a88300343ef293c86a8ef7b4d3e20b8c2fd2a24c6c4ead11d2ba3b1bfca
    contract_hash: 71c1df088f0d75888f70f3c339b7e0f88331a8d5ad46b372f9ab2b9d7c34368d
    binding_hash: 9eafec54471291f520d3be6b22c13c3495f83484fe33518f583592f8fa650981
    fingerprint: a128bc863ed26bec3d44afa2b076a63606dca30383a76e0027c6e68e01b4717c
    fingerprint_components:
      contract: 71c1df088f0d75888f70f3c339b7e0f88331a8d5ad46b372f9ab2b9d7c34368d
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
      - symbol_id: SYM-proof-plugin-api-version
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
      test_id: TEST-proof-plugin-api-version
      pattern:
        symbol_id: SYM-cap-plugin-kibi-plugin-api-version-f5d09d81
        type: string
        value: kibi.plugin.v1
    certificate_digest: ad8b40e9c6eca6822851c8400583472e03513c8ee3d8c87f64e442f7ab00b00d
    claim_bindings:
      - claim_key: CLAIM-4B5530044039AD39
        requirement_id: REQ-capability-plugin-protocol-identifiers
        fact_id: FACT-plugin-api-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.plugin.v1
---
Proves that the Kibi plugin API version shall be kibi.plugin.v1, against the code Kibi reads at ingest.