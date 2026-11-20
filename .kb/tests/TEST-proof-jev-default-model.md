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
    receipt_id: PR-5df6c760f45c707cced9c48c
    test_id: TEST-proof-jev-default-model
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: bcb03f60717198e428d9c690fa971ea2e9daef894742a3ccc8ca17c1a492f6cb
    binding_hash: 75ea590fe6c3e99aac4c3d47fcb6032087f141e7814047c9f76d2f23a054e36f
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