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
    receipt_id: PR-925fc1975225052f968e317f
    test_id: TEST-proof-search-hint-shown-limit
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:56.621Z'
    finished_at: '2026-11-16T12:25:00.016Z'
    artifact_digest: 6c8634cac1ce07fa01e37c527df2e2aafcfd220a3eaa232c0bcaf50a6332fd27
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