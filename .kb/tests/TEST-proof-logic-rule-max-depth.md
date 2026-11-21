---
title: A logical rule shall nest at most 16 levels deep, by an arithmetic proof
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
    - symbol_id: SYM-proof-logic-rule-max-depth
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-cli-logic-ir-LOGIC_RULE_MAX_DEPTH
  proves:
    - CLAIM-FEB9A725F1FA8930
origin:
  kind: agent
  recorded_at: '2026-10-28T17:19:31.672Z'
id: TEST-proof-logic-rule-max-depth
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e9857807fdc2c073416c7083
    test_id: TEST-proof-logic-rule-max-depth
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 245519b78541fc25227774d731bdb323dffcc1416b62b3433f0540d51810cd09
    binding_hash: 570b3684b19197fd87b94cda2574c3e33f431d869a3a92678ac8de454d2145de
    fingerprint: 80b06374b450d32c6849523d232a9ffbaa8c67715843554eeefa5bc5836db26c
    fingerprint_components:
      contract: 245519b78541fc25227774d731bdb323dffcc1416b62b3433f0540d51810cd09
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
      - symbol_id: SYM-proof-logic-rule-max-depth
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
      test_id: TEST-proof-logic-rule-max-depth
      variable: max_depth
      value_type: int
      assumptions:
        - operator: eq
          value: 16
      claim:
        operator: eq
        value: 16
    certificate_digest: 7a816fadf660f026b3e71b3103e712996b0b7633bf15ded48aec24b63d8375b5
    claim_bindings:
      - claim_key: CLAIM-FEB9A725F1FA8930
        requirement_id: REQ-kibi-logic-rule-limits
        fact_id: FACT-logic-rule-max-depth
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 16
          value_type: int
          variable: max_depth
---
Proves that a logical rule shall nest at most 16 levels deep, against the code Kibi reads at ingest.