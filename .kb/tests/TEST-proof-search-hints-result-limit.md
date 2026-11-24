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
    receipt_id: PR-8a454f458af4efceb2295814
    test_id: TEST-proof-search-hints-result-limit
    scope: unit
    outcome: passed
    code_snapshot: a0d30bff4003b1581432022006ec79ddf671dff094f79ab8d577e6b22a3a870c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-24T11:18:34.961Z'
    finished_at: '2026-11-24T11:18:35.063Z'
    artifact_digest: 2ec6f52b50145ff8c482c6e02d179fc52d5353fbf6dee61c7ebe7e1647f216da
    contract_hash: 41c15d33c07ca123d22b18957a8e273feeb516f7b815217ae7bf668e7755c287
    binding_hash: 1664b343db95104c977234997882fc3b9b5e90ef230657db9c2b2ad58a2ff7d5
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