---
title: The proof receipt version shall be kibi.proof-receipt.v2, by a regex proof
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
    - symbol_id: SYM-proof-proof-receipt-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-proof-receipt-version
  proves:
    - CLAIM-3F7C7D6130772E14
origin:
  kind: agent
  recorded_at: '2026-10-28T10:54:30.323Z'
id: TEST-proof-proof-receipt-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6071ceb812a1b033fda6973b
    test_id: TEST-proof-proof-receipt-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: bbdd99b8fb4f254255ea8de7da39927028bdd61e35b06ffeabb668c76efb51f5
    binding_hash: b6974360b4abe5d52f4f5d4a512fc285a1043827754a810e3b07dadf39eb60c4
    fingerprint: 470263deeb5e38c0666a782b990da25469d3df2380d822adfd30b22d12d49f0b
    fingerprint_components:
      contract: bbdd99b8fb4f254255ea8de7da39927028bdd61e35b06ffeabb668c76efb51f5
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
      - symbol_id: SYM-proof-proof-receipt-version
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
      test_id: TEST-proof-proof-receipt-version
      pattern:
        symbol_id: SYM-proof-receipt-version
        type: string
        value: kibi.proof-receipt.v2
    certificate_digest: f5433cce8dd428d8114bebad965c52d7782b2ced3b054636da20388b31f2d7db
    claim_bindings:
      - claim_key: CLAIM-3F7C7D6130772E14
        requirement_id: REQ-kibi-proof-protocol-versions
        fact_id: FACT-proof-receipt-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.proof-receipt.v2
---
Proves that the proof receipt version shall be kibi.proof-receipt.v2, against the code Kibi reads at ingest.