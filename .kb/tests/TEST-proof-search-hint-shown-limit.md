---
title: The search hints host shows at most 10 hints, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-hint-shown-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-search-hint-limit
  proves:
    - CLAIM-B5C1FB6E9FBCDB23
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:55.854Z'
id: TEST-proof-search-hint-shown-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fe9d625137d3ba3620a05ed6
    test_id: TEST-proof-search-hint-shown-limit
    scope: unit
    outcome: passed
    code_snapshot: 530ed6d3e0fdf53eafb9d4b5e11b35ba0b15b56cb1091a5c0497fde4e24cb277
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T21:35:35.758Z'
    finished_at: '2026-10-29T21:35:35.913Z'
    artifact_digest: b25fb4f27b48ba1d8b3b5e13afcf33bdfddf5675a8f9b3cc35185b2bc94a2c2c
    contract_hash: 1abd8505e36e09618f0bba7abbe72d952cbc295ffc44cd5133c562d68502332b
    binding_hash: 5a72e60b12c610176304d9ab8aa5db2d57b7ee7724b56ff49cb7018b795ff6b3
    fingerprint: 26a3d111bf4aa2a46a68e1ff5eaf25fa98b97ab6f6a484c064c8542861f64733
    fingerprint_components:
      contract: 1abd8505e36e09618f0bba7abbe72d952cbc295ffc44cd5133c562d68502332b
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
      - symbol_id: SYM-proof-search-hint-shown-limit
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
      test_id: TEST-proof-search-hint-shown-limit
      variable: max_shown_hints
      value_type: int
      assumptions:
        - operator: eq
          value: 10
      claim:
        operator: lte
        value: 10
    certificate_digest: 825bda9f1fd6308bca86ce9447a36bddbbd608d175cc199a6a51c63fb11694b0
    claim_bindings:
      - claim_key: CLAIM-B5C1FB6E9FBCDB23
        requirement_id: REQ-kibi-search-hints-limits
        fact_id: FACT-search-hint-shown-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 10
          value_type: int
          variable: max_shown_hints
---
Reads SEARCH_HINT_LIMIT and proves the search hints host shows at most 10 hints.