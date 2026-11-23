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
    receipt_id: PR-f4bb2529ad32c90c2ee97788
    test_id: TEST-proof-opencode-bootstrap-command
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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