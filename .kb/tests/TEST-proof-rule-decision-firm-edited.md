---
title: An edited firm decision shall be reported as decision-firm-edited, by a regex proof
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
    - symbol_id: SYM-proof-rule-decision-firm-edited
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-decision-firm-edited-rule
  proves:
    - CLAIM-EE136E4E5A388B56
origin:
  kind: agent
  recorded_at: '2026-10-29T16:39:49.291Z'
id: TEST-proof-rule-decision-firm-edited
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-723e0e671da7bbbed808303b
    test_id: TEST-proof-rule-decision-firm-edited
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:32:44.796Z'
    finished_at: '2026-10-29T17:32:45.015Z'
    artifact_digest: aabc283f807807474acd12ee3d4b7186ce6b79240fb7e088147e73fb515a2761
    contract_hash: bfec31e89f696c82e431b7d6aac98c664f722147abdadcae81330367fd69b958
    binding_hash: 2c737058e49c84610fae2b96bf9427f8b02ed229daf71838ea657001b7a4dd5b
    fingerprint: 675775c69c272af938955c397978b972940aaf2d73dcdb0ad977c106f0d0f4c9
    fingerprint_components:
      contract: bfec31e89f696c82e431b7d6aac98c664f722147abdadcae81330367fd69b958
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
      - symbol_id: SYM-proof-rule-decision-firm-edited
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
      test_id: TEST-proof-rule-decision-firm-edited
      pattern:
        symbol_id: SYM-decision-firmness-decision-firm-edited-rule
        type: string
        value: decision-firm-edited
    certificate_digest: 2e78046d43a1cbd143f94e9aee6e0c7d8935164996447db756c087f7d773b3b8
    claim_bindings:
      - claim_key: CLAIM-EE136E4E5A388B56
        requirement_id: REQ-kb-decision-firmness-rule-names
        fact_id: FACT-rule-decision-firm-edited
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: decision-firm-edited
---
Proves that an edited firm decision shall be reported as decision-firm-edited, against the code Kibi reads at ingest.