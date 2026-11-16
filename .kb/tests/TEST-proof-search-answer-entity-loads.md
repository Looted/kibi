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
    receipt_id: PR-67276d6cee92effe2b785e7b
    test_id: TEST-proof-search-answer-entity-loads
    scope: unit
    outcome: passed
    code_snapshot: 7baf185385700cbc6052c693e2fdd4925358ed509447ee615fc111e64f05332f
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T13:13:21.691Z'
    finished_at: '2026-11-16T13:13:34.165Z'
    artifact_digest: a8fbcd1d37b88b5b6210ec5eae501c1908108a0e2126ffb36bdebb77dfba6d95
    contract_hash: 126f8de588592b49b96185dc38c4daf9efd2da7f9085f1d17c7a36030c06ce43
    binding_hash: aa845ef8f358e999d5434a00d0511e750ca9b20961a30da856f5f97560ea5ab2
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