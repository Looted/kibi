---
title: Derived symbol coordinates shall start at KB schema version 13, by an arithmetic proof
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
    - symbol_id: SYM-proof-derived-coordinates-schema
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-derived-coordinates-schema-version
  proves:
    - CLAIM-6C377382E2EA545C
origin:
  kind: agent
  recorded_at: '2026-10-28T20:34:03.024Z'
id: TEST-proof-derived-coordinates-schema
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1006c4b99a9bb99d26158c72
    test_id: TEST-proof-derived-coordinates-schema
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:16.263Z'
    finished_at: '2026-11-04T18:30:16.404Z'
    artifact_digest: 3a4df9101ee0e45aa2e531b6674304b63187d1505151d12cbb2e72d625022b2c
    contract_hash: 85d1f8b8db474398432a6e869b5a477f869ba3caae0aa1e04d8f59eb868bc549
    binding_hash: edb680661e6ec9e3bed73abf71acccc18cd16fcd540a8cefa37c8ee4ba0f964d
    fingerprint: 186877849f77a2793a80673ed374d09360d8876ac78a2c835d3a270aaa7b6599
    fingerprint_components:
      contract: 85d1f8b8db474398432a6e869b5a477f869ba3caae0aa1e04d8f59eb868bc549
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
      - symbol_id: SYM-proof-derived-coordinates-schema
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
      test_id: TEST-proof-derived-coordinates-schema
      variable: derived_coordinates_schema
      value_type: int
      assumptions:
        - operator: eq
          value: 13
      claim:
        operator: eq
        value: 13
    certificate_digest: 55cdbe5e30dae164aa59ad2692485b46de7bea183680afc247df1e8c34c704c6
    claim_bindings:
      - claim_key: CLAIM-6C377382E2EA545C
        requirement_id: REQ-cli-migration-symbol-codes
        fact_id: FACT-derived-coordinates-schema
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 13
          value_type: int
          variable: derived_coordinates_schema
---
Proves that derived symbol coordinates shall start at KB schema version 13, against the code Kibi reads at ingest.