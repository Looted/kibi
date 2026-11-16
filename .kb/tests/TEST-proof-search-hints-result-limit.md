---
title: A kibi.search-hints.v1 result holds at most 20 hints, by an arithmetic proof
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
    - symbol_id: SYM-proof-search-hints-result-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-search-hints-max-limit
  proves:
    - CLAIM-B97B16DBF59019BC
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:57.419Z'
id: TEST-proof-search-hints-result-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-75c6558ed2a2cc2316007861
    test_id: TEST-proof-search-hints-result-limit
    scope: unit
    outcome: passed
    code_snapshot: 11f442c7ec4bb6d8777db81ff07ba6a13346fd4d39b9ff7058236e99adc44d21
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T12:24:43.511Z'
    finished_at: '2026-11-16T12:24:47.390Z'
    artifact_digest: c302c7e24a7620ef48186a4712785c1415b13bf1adc13e148ea4b8358965a583
    contract_hash: 41c15d33c07ca123d22b18957a8e273feeb516f7b815217ae7bf668e7755c287
    binding_hash: 109c69d0fb21ef634e53afbad7775d400e2bbf7086cc107a5abb5251569357be
    fingerprint: 97aaaa94d25d85c00a01e615adbff9ce0de162ae3839ff3f00d6ac70987c4b8a
    fingerprint_components:
      contract: 41c15d33c07ca123d22b18957a8e273feeb516f7b815217ae7bf668e7755c287
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
      - symbol_id: SYM-proof-search-hints-result-limit
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
      test_id: TEST-proof-search-hints-result-limit
      variable: max_result_hints
      value_type: int
      assumptions:
        - operator: eq
          value: 20
      claim:
        operator: lte
        value: 20
    certificate_digest: 13b3d1e2fb07fed85576251229bac66e4595dfbfdc6d68edb72455ee9976406d
    claim_bindings:
      - claim_key: CLAIM-B97B16DBF59019BC
        requirement_id: REQ-kibi-search-hints-limits
        fact_id: FACT-search-hints-result-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: lte
          value: 20
          value_type: int
          variable: max_result_hints
---
Reads SEARCH_HINTS_MAX_LIMIT and proves a kibi.search-hints.v1 result holds at most 20 hints.