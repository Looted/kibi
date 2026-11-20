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
    receipt_id: PR-b39278ea120bdff69f03c196
    test_id: TEST-proof-logic-rule-max-depth
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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