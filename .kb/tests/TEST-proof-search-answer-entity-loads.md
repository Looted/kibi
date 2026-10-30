---
title: A search answer shall load at most 70 entity rows, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-search-answer-entity-loads
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-search-answer-limits
      export: SEARCH_ANSWER_LIMITS.entityLoads
  proves:
    - CLAIM-10E8E19FE532570B
origin:
  kind: agent
  recorded_at: '2026-10-28T11:10:49.946Z'
id: TEST-proof-search-answer-entity-loads
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7e5fe6cb1ade7ea488ffde10
    test_id: TEST-proof-search-answer-entity-loads
    scope: unit
    outcome: passed
    code_snapshot: 98c9548fc40fd9d92b46f3a96e28309ed72f08183f2027ffa1ec112951c0d07b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:12:44.594Z'
    finished_at: '2026-10-28T11:12:44.705Z'
    artifact_digest: eeaea1a55bd52e04f6aff46925c306ac65d1d8697ee3f057b3b9f30e6b8aa50e
    contract_hash: 126f8de588592b49b96185dc38c4daf9efd2da7f9085f1d17c7a36030c06ce43
    binding_hash: 583dd6aef426aa5e6a821f9dbe9d55d339e002018715e6e03541f1860046820b
    fingerprint: 56e1f3679c4e7fe930006ed7501d7ff1ee720faed1c2e7202fba0684b6295e45
    fingerprint_components:
      contract: 126f8de588592b49b96185dc38c4daf9efd2da7f9085f1d17c7a36030c06ce43
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
      - symbol_id: SYM-proof-search-answer-entity-loads
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-search-answer-entity-loads
      variable: entity_loads
      value_type: int
      assumptions:
        - operator: eq
          value: 70
      claim:
        operator: eq
        value: 70
    certificate_digest: 7ed67d582b7f12a3a3d9f811ede8527e24c152fac353a7f85d3f6d72080f1a89
    claim_bindings:
      - claim_key: CLAIM-10E8E19FE532570B
        requirement_id: REQ-kibi-search-answer-limits
        fact_id: FACT-search-answer-entity-loads
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 70
          value_type: int
          variable: entity_loads
---
Proves that a search answer shall load at most 70 entity rows, against the code Kibi reads at ingest.