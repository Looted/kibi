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
    receipt_id: PR-54fe9bced867688f06a2c474
    test_id: TEST-proof-search-hint-shown-limit
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 1abd8505e36e09618f0bba7abbe72d952cbc295ffc44cd5133c562d68502332b
    binding_hash: 318eedcde70724d423a318e4fb1d7122a1d44302062da10fea34918b4c75d420
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