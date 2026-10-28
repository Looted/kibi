---
title: 'The no impact declaration shall be Kibi-Impact: none, by a regex proof'
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
    - symbol_id: SYM-proof-no-impact-declaration
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-KIBI-NO-IMPACT-DECLARATION
  proves:
    - CLAIM-C90E9B30C79A70AE
origin:
  kind: agent
  recorded_at: '2026-10-28T18:57:10.062Z'
id: TEST-proof-no-impact-declaration
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0a26ec4a926ef74cec117ca5
    test_id: TEST-proof-no-impact-declaration
    scope: unit
    outcome: passed
    code_snapshot: 1525e26386be688f0153859837e8864169cd0c2608dba36204dcab4f0d708d54
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:00:26.962Z'
    finished_at: '2026-10-28T19:00:27.090Z'
    artifact_digest: 0aa51d486314da6a8c19aecc004d4b333418a4eacc3b51ddda03ddf9ac37700e
    contract_hash: f4a08fbd59c7c15db65769319b9613ce389e5b1dcbf1703b927419ff76ba8119
    binding_hash: 673ae37fb0d5811b358028214584f04210e2660c60ad8bf04b6e8eac9af56f66
    fingerprint: d9968dc712ee25030010d2aacaaee3abc8c33db548cee45ed098bdc7d663f5b0
    fingerprint_components:
      contract: f4a08fbd59c7c15db65769319b9613ce389e5b1dcbf1703b927419ff76ba8119
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
      - symbol_id: SYM-proof-no-impact-declaration
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
      test_id: TEST-proof-no-impact-declaration
      pattern:
        symbol_id: SYM-KIBI-NO-IMPACT-DECLARATION
        type: string
        value: 'Kibi-Impact: none'
    certificate_digest: e54fd9d546aa6c49731aae85aae2a6778da9c3bf03902ea6c13dc9cb67b228c7
    claim_bindings:
      - claim_key: CLAIM-C90E9B30C79A70AE
        requirement_id: REQ-staged-impact-identifiers
        fact_id: FACT-no-impact-declaration
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: 'Kibi-Impact: none'
---
Proves that the no impact declaration shall be Kibi-Impact: none, against the code Kibi reads at ingest.