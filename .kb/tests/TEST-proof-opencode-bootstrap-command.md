---
title: The OpenCode bootstrap command shall be kibi-bootstrap, by a regex proof
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
    - symbol_id: SYM-proof-opencode-bootstrap-command
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-kibi-bootstrap-opencode-src-kibi-bootstrap-capability-kibi-bootstrap-command-name
  proves:
    - CLAIM-BAC667AC10500557
origin:
  kind: agent
  recorded_at: '2026-10-29T17:02:35.912Z'
id: TEST-proof-opencode-bootstrap-command
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cd01cdbc385c5fa836f5580f
    test_id: TEST-proof-opencode-bootstrap-command
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 7db92b11165b1057ea5d7ccb69b4bed41bd16054a28be33808e1f253a3a8714e
    binding_hash: 51926886fbb5807df5692fd3b783f836a1b205486f79dbe470788d5b192479ec
    fingerprint: 88796d2b687ce4d17492afa89e883ea104be6f7b8f85ff722c266d387f254c0d
    fingerprint_components:
      contract: 7db92b11165b1057ea5d7ccb69b4bed41bd16054a28be33808e1f253a3a8714e
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
      - symbol_id: SYM-proof-opencode-bootstrap-command
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
      test_id: TEST-proof-opencode-bootstrap-command
      pattern:
        symbol_id: SYM-kibi-bootstrap-opencode-src-kibi-bootstrap-capability-kibi-bootstrap-command-name
        type: string
        value: kibi-bootstrap
    certificate_digest: 29d80e65372278c90694fada6ad35d94dcc52969a0d5c5ae3de2021088bfeb9b
    claim_bindings:
      - claim_key: CLAIM-BAC667AC10500557
        requirement_id: REQ-opencode-plugin-ids
        fact_id: FACT-opencode-bootstrap-command
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi-bootstrap
---
Proves that the OpenCode bootstrap command shall be kibi-bootstrap, against the code Kibi reads at ingest.