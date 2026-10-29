---
title: An acknowledged missing context shall be reported as entity-context-acknowledged, by a regex proof
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
    - symbol_id: SYM-proof-rule-entity-context-acknowledged
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-entity-context-acknowledged-rule
  proves:
    - CLAIM-D6F9F25234BCBB15
origin:
  kind: agent
  recorded_at: '2026-10-29T16:43:24.266Z'
id: TEST-proof-rule-entity-context-acknowledged
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8eae38d0077abaed059e9f16
    test_id: TEST-proof-rule-entity-context-acknowledged
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:33:21.277Z'
    finished_at: '2026-10-29T17:33:21.495Z'
    artifact_digest: 8f3f4a1f0d38b6dffc0fbf33e452d075f6a8e67a2c98a30a661b3a4d060a0138
    contract_hash: 66dca2ebe252aaaa72f16b130b22978c094e3e6a4577fe1534bdd0badeea623b
    binding_hash: 7166e0fc7ab27ed4aaddfdf40890fd9d728bc0419a240143937d855f3cd01b6d
    fingerprint: 02badf57357dc44c85d063ba2f8668473323a99e6cc6b0aa64c65d786baf06ce
    fingerprint_components:
      contract: 66dca2ebe252aaaa72f16b130b22978c094e3e6a4577fe1534bdd0badeea623b
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
      - symbol_id: SYM-proof-rule-entity-context-acknowledged
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
      test_id: TEST-proof-rule-entity-context-acknowledged
      pattern:
        symbol_id: SYM-const-entity-context-acknowledged-rule
        type: string
        value: entity-context-acknowledged
    certificate_digest: 0d11b0ac4a73a675a31f40c7bf7693b3690e1ce75baeef900d26d3f2076e1dcc
    claim_bindings:
      - claim_key: CLAIM-D6F9F25234BCBB15
        requirement_id: REQ-kb-entity-context-rule-names
        fact_id: FACT-rule-entity-context-acknowledged
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity-context-acknowledged
---
Proves that an acknowledged missing context shall be reported as entity-context-acknowledged, against the code Kibi reads at ingest.