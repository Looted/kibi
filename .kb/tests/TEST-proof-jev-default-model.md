---
title: The Jev model defaults to jev-latest, by a regex proof
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
    - symbol_id: SYM-proof-jev-default-model
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cap-plugin-jev-default-model
  proves:
    - CLAIM-8A4067501CAD35CE
origin:
  kind: agent
  recorded_at: '2026-10-28T09:36:57.163Z'
id: TEST-proof-jev-default-model
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b57926493779ed53331fec4b
    test_id: TEST-proof-jev-default-model
    scope: unit
    outcome: passed
    code_snapshot: 374c0615cf4ed585796e9ab43d3b69c8e4593f2471fb8597c2a06ba7a14aad48
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:37:34.050Z'
    finished_at: '2026-10-28T09:37:34.169Z'
    artifact_digest: a1b44cb7b5a01304493a59757c5aa77780be21accd120aafd2377a012b7b6e7c
    contract_hash: bcb03f60717198e428d9c690fa971ea2e9daef894742a3ccc8ca17c1a492f6cb
    binding_hash: 004367970a63a6fd60fe3adc4cc9b97202184fc8c243e1a243afeb5279109e28
    fingerprint: b69a6ce1408f0d799c6e1d9a084f38c6a19a6e0d00144b96071890340f65270c
    fingerprint_components:
      contract: bcb03f60717198e428d9c690fa971ea2e9daef894742a3ccc8ca17c1a492f6cb
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
      - symbol_id: SYM-proof-jev-default-model
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
      test_id: TEST-proof-jev-default-model
      pattern:
        symbol_id: SYM-cap-plugin-jev-default-model
        type: string
        value: jev-latest
    certificate_digest: ee6f682fce5f1320f34b274aa70418c3311578034b613d3ce1ec8cb455d0f03c
    claim_bindings:
      - claim_key: CLAIM-8A4067501CAD35CE
        requirement_id: REQ-capability-plugin-jev-defaults
        fact_id: FACT-jev-default-model
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: jev-latest
---
Reads JEV_DEFAULT_MODEL and proves the Jev model defaults to jev-latest.