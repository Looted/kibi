---
title: The impact policy file shall be .kibi/impact-policy.json, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-impact-policy-path
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-impact-stage-e-impact-policy-path
  proves:
    - CLAIM-FF8C4B4F98821E01
origin:
  kind: agent
  recorded_at: '2026-10-28T17:32:00.167Z'
id: TEST-proof-impact-policy-path
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d03d84352dcb5a2e86d42ed3
    test_id: TEST-proof-impact-policy-path
    scope: unit
    outcome: passed
    code_snapshot: 5ed496f2f4162fe5e2f3ba3d9e466d7f9ee6dc45325e320c48977a64f361547b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:35:09.267Z'
    finished_at: '2026-10-28T17:35:09.371Z'
    artifact_digest: 516f82a88c4d04ca320eb4876144383e82af11c12582de2a52818c94653922c1
    contract_hash: 868558bc37fd13e025b7834c9530601b62aa519c43545d44e54068388f5b08bb
    binding_hash: 55e66b1ffcfe57f033630aa11ffd858e3eca635a467338316fadc1fafb7136cd
    fingerprint: cd401d5d0a9b4d6b6c34ad7fa9f02e7b885aa82a6cad0b4bbb77907a181f1471
    fingerprint_components:
      contract: 868558bc37fd13e025b7834c9530601b62aa519c43545d44e54068388f5b08bb
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
      - symbol_id: SYM-proof-impact-policy-path
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-impact-policy-path
      pattern:
        symbol_id: SYM-impact-stage-e-impact-policy-path
        type: string
        value: .kibi/impact-policy.json
    certificate_digest: e15945fd9ec7177d1f1f8f868af8fb741fef793130f6222f9f5794323061b96d
    claim_bindings:
      - claim_key: CLAIM-FF8C4B4F98821E01
        requirement_id: REQ-impact-review-identifiers
        fact_id: FACT-impact-policy-path
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: .kibi/impact-policy.json
---
Proves that the impact policy file shall be .kibi/impact-policy.json, against the code Kibi reads at ingest.