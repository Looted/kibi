---
title: A logical rule shall hold at most 64 atoms, by an arithmetic proof
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
    - symbol_id: SYM-proof-logic-rule-max-atoms
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-logic-ir-LOGIC_RULE_MAX_ATOMS
  proves:
    - CLAIM-4D43FA87C153EBE8
origin:
  kind: agent
  recorded_at: '2026-10-28T17:19:12.343Z'
id: TEST-proof-logic-rule-max-atoms
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9b65627a4d7fb3cd44977775
    test_id: TEST-proof-logic-rule-max-atoms
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: d4a00337bb908d4673f53a467703db494cb3de42bfeb176b1cde331511897e09
    binding_hash: 0ca71a4bfad64d40b65cb66b15d52c2d213134ebab18653212c07797d143bfbe
    fingerprint: 4e9718662934697ffe1ebd083de23842690f9e59537bb57638afc30c7832abe2
    fingerprint_components:
      contract: d4a00337bb908d4673f53a467703db494cb3de42bfeb176b1cde331511897e09
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
      - symbol_id: SYM-proof-logic-rule-max-atoms
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
      test_id: TEST-proof-logic-rule-max-atoms
      variable: max_atoms
      value_type: int
      assumptions:
        - operator: eq
          value: 64
      claim:
        operator: eq
        value: 64
    certificate_digest: 72aca3c5c0c15e06f9ad775d04153f4c0e2828820a6dae01a99d12d7bec77769
    claim_bindings:
      - claim_key: CLAIM-4D43FA87C153EBE8
        requirement_id: REQ-kibi-logic-rule-limits
        fact_id: FACT-logic-rule-max-atoms
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 64
          value_type: int
          variable: max_atoms
---
Proves that a logical rule shall hold at most 64 atoms, against the code Kibi reads at ingest.