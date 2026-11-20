---
title: An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-external-classifier-operations
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cap-plugin-external-semantic-classifier-operations-2fb73e29
  proves:
    - CLAIM-C22A6481F799BDA3
origin:
  kind: agent
  recorded_at: '2026-10-29T10:31:22.047Z'
id: TEST-proof-external-classifier-operations
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ee70b9167af3ecfa06ca9385
    test_id: TEST-proof-external-classifier-operations
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: ce93b77b40b45c348ebf7f58dc82787bb261e4098c304e213c5d73a8da068376
    binding_hash: 5fe5b955b85e0046a07d2485f1c23389df6f2a4a236dc780f469a1ba6a7353fe
    fingerprint: 74d8590cd141c43d067916d1f9ff3abd4c3cf5c7a5d001eeedac0326063de7ab
    fingerprint_components:
      contract: ce93b77b40b45c348ebf7f58dc82787bb261e4098c304e213c5d73a8da068376
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
      - symbol_id: SYM-proof-external-classifier-operations
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-external-classifier-operations
      domain:
        symbol_id: SYM-cap-plugin-external-semantic-classifier-operations-2fb73e29
        members:
          - kb_semantic_advisor
          - kb_compile_intent
      results:
        - member: kb_semantic_advisor
          outcome: passed
        - member: kb_compile_intent
          outcome: passed
    certificate_digest: e9602cf3f8b91fe15ab63cb1be4959915c85131d9eabbd2d199d669b03b17057
    claim_bindings:
      - claim_key: CLAIM-C22A6481F799BDA3
        requirement_id: REQ-capability-plugin-vocabulary
        fact_id: FACT-external-classifier-operations
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - kb_compile_intent
            - kb_semantic_advisor
---
Proves that an external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent, against the code Kibi reads at ingest.