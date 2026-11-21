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
    receipt_id: PR-d8461ca42377e0596cf86954
    test_id: TEST-proof-rule-decision-firm-edited
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: bfec31e89f696c82e431b7d6aac98c664f722147abdadcae81330367fd69b958
    binding_hash: 19f889b138f7b752deb1bf6f8c79d7cc681bf58d85d0ecd608a1e039b6c308d2
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