---
title: A logical rule shall use at most 32 variables, by an arithmetic proof
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
    - symbol_id: SYM-proof-logic-rule-max-variables
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-logic-ir-LOGIC_RULE_MAX_VARIABLES
  proves:
    - CLAIM-FA3DB343EC00BA03
origin:
  kind: agent
  recorded_at: '2026-10-28T17:19:50.760Z'
id: TEST-proof-logic-rule-max-variables
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-aeb7c4538bf1c8b5aedc4022
    test_id: TEST-proof-logic-rule-max-variables
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 6eaf777d426e4948dbb2970caeefbb4e0672df3d48bb8ee87d1b44abbc61618c
    binding_hash: f66ee5df68c84e0e1b3188d63e5d62193ef1dcb291b4f4dba1febd9554b6304f
    fingerprint: 9160f3a63f887607844c774fe94662f9a6f39da415c7125e2d8a483460bcb16e
    fingerprint_components:
      contract: 6eaf777d426e4948dbb2970caeefbb4e0672df3d48bb8ee87d1b44abbc61618c
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
      - symbol_id: SYM-proof-logic-rule-max-variables
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
      test_id: TEST-proof-logic-rule-max-variables
      variable: max_variables
      value_type: int
      assumptions:
        - operator: eq
          value: 32
      claim:
        operator: eq
        value: 32
    certificate_digest: a7db188f58d2212e6502da4423aa65d7eaede3afc250415fead120e794929f4e
    claim_bindings:
      - claim_key: CLAIM-FA3DB343EC00BA03
        requirement_id: REQ-kibi-logic-rule-limits
        fact_id: FACT-logic-rule-max-variables
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 32
          value_type: int
          variable: max_variables
---
Proves that a logical rule shall use at most 32 variables, against the code Kibi reads at ingest.