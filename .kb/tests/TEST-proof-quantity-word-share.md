---
title: The word share that ties two value facts is 0.5, by an arithmetic proof
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
    - symbol_id: SYM-proof-quantity-word-share
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-quantity-layer-quantity-word-share
  proves:
    - CLAIM-FB2AD2FC43C16DBB
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:13.014Z'
id: TEST-proof-quantity-word-share
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1cd3d51359ef560f8368dbe3
    test_id: TEST-proof-quantity-word-share
    scope: unit
    outcome: passed
    code_snapshot: 85b2624165d7e44fc735b108a25d4917ae5c54792c3260a53e21c812ec79a72a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:03:48.781Z'
    finished_at: '2026-11-17T06:04:07.082Z'
    artifact_digest: 2548c0b6ce6a3d2df4c3a18e84a67d50f3b6aae32f2a888c83c74cb7dbd13d2c
    contract_hash: fc881b28ae09d1f1424630c68a1deee7f1760a7c4f0863772c3ceaea583cb036
    binding_hash: 07803514ba6411ec363fd8df6468176a13082c35d12787695f2c50427facf707
    fingerprint: 548d795c44ecda506794967258c20165078d6ff539d42216be3df7d45863c373
    fingerprint_components:
      contract: fc881b28ae09d1f1424630c68a1deee7f1760a7c4f0863772c3ceaea583cb036
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
      - symbol_id: SYM-proof-quantity-word-share
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
      test_id: TEST-proof-quantity-word-share
      variable: word_share
      value_type: real
      assumptions:
        - operator: eq
          value: 0.5
      claim:
        operator: eq
        value: 0.5
    certificate_digest: 3810203608880ea87fa94a21c7de452290d1af8ebc78105f3b72c021ba8af3a8
    claim_bindings:
      - claim_key: CLAIM-FB2AD2FC43C16DBB
        requirement_id: REQ-check-quantity-duplicate-pairing
        fact_id: FACT-check-quantity-duplicate-word-share
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 0.5
          value_type: real
          variable: word_share
---
Proves that the share of words property keys or claim texts must have in common to tie two value facts is 0.5, against the code Kibi reads at ingest.