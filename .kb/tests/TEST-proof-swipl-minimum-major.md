---
title: The minimum SWI-Prolog major version shall be 9, by an arithmetic proof
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
    - symbol_id: SYM-proof-swipl-minimum-major
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-prolog-swipl-minimum-swipl-major-src
  proves:
    - CLAIM-FFF27D6BB2C61251
origin:
  kind: agent
  recorded_at: '2026-10-28T10:35:25.456Z'
id: TEST-proof-swipl-minimum-major
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c45e9eb152a69d739b25e745
    test_id: TEST-proof-swipl-minimum-major
    scope: unit
    outcome: passed
    code_snapshot: 41a48609efca988cd92ae25622723edd5d4ec213cafb3ae6df7bbfd55d47e1f1
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:35:56.682Z'
    finished_at: '2026-10-28T10:35:56.775Z'
    artifact_digest: 6c7e40fa5b1bd83fce4b33438c39dde8660d152a5ca34eb1cc539b2de4e4b6e8
    contract_hash: 497bb053eb5cd2452525b366bab350c87a22ce070a6692d81c1d1b35c47151c7
    binding_hash: bbb4f9bfc3dbddc0e1b34881f2e558a85c473cb66f280e6aa95bf32f58919158
    fingerprint: b1bb62dfca06dafa3915be9867914bfa0de960628a52e14acdd1ecf1273c44f6
    fingerprint_components:
      contract: 497bb053eb5cd2452525b366bab350c87a22ce070a6692d81c1d1b35c47151c7
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
      - symbol_id: SYM-proof-swipl-minimum-major
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
      test_id: TEST-proof-swipl-minimum-major
      variable: minimum_swipl_major
      value_type: int
      assumptions:
        - operator: eq
          value: 9
      claim:
        operator: eq
        value: 9
    certificate_digest: 02015ca509003f54c5b1fddaadfa235ccaa228f2a93d1ab2b423aa3ecf20a79e
    claim_bindings:
      - claim_key: CLAIM-FFF27D6BB2C61251
        requirement_id: REQ-prolog-swipl-minimum-version
        fact_id: FACT-swipl-minimum-major
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 9
          value_type: int
          variable: minimum_swipl_major
---
Proves that the minimum SWI-Prolog major version shall be 9, against the code Kibi reads at ingest.