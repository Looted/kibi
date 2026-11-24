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
    receipt_id: PR-00d5536575259892fc61c7ad
    test_id: TEST-proof-search-hint-shown-limit
    scope: unit
    outcome: passed
    code_snapshot: a0d30bff4003b1581432022006ec79ddf671dff094f79ab8d577e6b22a3a870c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T11:18:28.831Z'
    finished_at: '2026-11-24T11:18:28.945Z'
    artifact_digest: 7af5bd83d289d796d9bbe742129cbdae4d33d03b17b05a53608822d06db5c69c
    contract_hash: 1abd8505e36e09618f0bba7abbe72d952cbc295ffc44cd5133c562d68502332b
    binding_hash: 414d42b83c29e0776f97b29ea015995cd2e0245c50a881fc2a5b241e30b9df58
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