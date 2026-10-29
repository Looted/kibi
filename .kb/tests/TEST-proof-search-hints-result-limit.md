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
    receipt_id: PR-73d3dd224c0628926b697ea9
    test_id: TEST-proof-search-hints-result-limit
    scope: unit
    outcome: passed
    code_snapshot: 7401288de38e9e8b7944be896dd261c4d681deedd2e4d0b2b47f20bb3a2de22b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T21:35:39.765Z'
    finished_at: '2026-10-29T21:35:39.908Z'
    artifact_digest: b593db8734fc2534bd7fd6e5038340f178fad00309009163047be60da71c9fb0
    contract_hash: 41c15d33c07ca123d22b18957a8e273feeb516f7b815217ae7bf668e7755c287
    binding_hash: 28fdb94e039dca37c2e463507b7fd34a2d25884b4e0756f6da8b55b75481c41f
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