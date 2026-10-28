---
title: The proof contract claims check rule shall be proof-contract-claims, by a regex proof
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
    - symbol_id: SYM-proof-proof-contract-claims-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-contract-claims-rule
  proves:
    - CLAIM-1308E97B03211146
origin:
  kind: agent
  recorded_at: '2026-10-28T10:58:28.095Z'
id: TEST-proof-proof-contract-claims-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8ddffec615b8e6761a448b26
    test_id: TEST-proof-proof-contract-claims-rule
    scope: unit
    outcome: passed
    code_snapshot: 384992ab10a9d5988c607ac168f6a6dfbde65187ee9b60b46cb95fb216aff1eb
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:00:23.477Z'
    finished_at: '2026-10-28T11:00:23.590Z'
    artifact_digest: 93c739aa64ffbf61be7d3da09600c7842841174739d222ba4b19caf4a855ac1a
    contract_hash: 921758303f8701bbbf93dd32f40b31c147f1ac12967a187f287a3700e6c501d3
    binding_hash: def5b3288c3efe9e506aa1a0a48259536512457cf801957e7dd52e78c044474e
    fingerprint: ffc890f975611bcfd2855025daca023e88ea0c1fde176de62b20922885826bb3
    fingerprint_components:
      contract: 921758303f8701bbbf93dd32f40b31c147f1ac12967a187f287a3700e6c501d3
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
      - symbol_id: SYM-proof-proof-contract-claims-rule
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
      test_id: TEST-proof-proof-contract-claims-rule
      pattern:
        symbol_id: SYM-const-proof-contract-claims-rule
        type: string
        value: proof-contract-claims
    certificate_digest: 8a770f849688dd966c6e07400230314e6b5f7d7a0f437b8fd18dda5377a6873a
    claim_bindings:
      - claim_key: CLAIM-1308E97B03211146
        requirement_id: REQ-kibi-claim-bound-proof-settings
        fact_id: FACT-proof-contract-claims-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof-contract-claims
---
Proves that the proof contract claims check rule shall be proof-contract-claims, against the code Kibi reads at ingest.