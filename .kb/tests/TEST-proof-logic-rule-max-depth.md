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
    receipt_id: PR-91557864adc5aea338fa4926
    test_id: TEST-proof-logic-rule-max-depth
    scope: unit
    outcome: passed
    code_snapshot: 1fcdc3b2c318886286faffa28fc34e8ae59ae46515e4d9f13da5489d1bc40d6e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T17:21:50.640Z'
    finished_at: '2026-10-28T17:21:50.755Z'
    artifact_digest: 5304c8a598154c4a3d4e75b91f6605e718e08956a3633d7021bc2cc0e98ef54f
    contract_hash: 245519b78541fc25227774d731bdb323dffcc1416b62b3433f0540d51810cd09
    binding_hash: 9def71541c56a3302ffdb8fafaac344689a4fcca8aadb9c6bd0c7d2d9fa7e8e7
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