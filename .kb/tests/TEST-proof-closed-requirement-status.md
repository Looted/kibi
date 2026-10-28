---
title: A superseded requirement shall close with status closed, by a regex proof
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
    - symbol_id: SYM-proof-closed-requirement-status
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-closed-requirement-status
  proves:
    - CLAIM-DD9D88701148517A
origin:
  kind: agent
  recorded_at: '2026-10-28T20:33:39.460Z'
id: TEST-proof-closed-requirement-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2ad71ed16f38c7d2af7f816e
    test_id: TEST-proof-closed-requirement-status
    scope: unit
    outcome: passed
    code_snapshot: fed4ebb783f2658a2b1a7673268d9b0ffcf80faa0d1f59c186900196eec682cc
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:36:53.349Z'
    finished_at: '2026-10-28T20:36:53.530Z'
    artifact_digest: 12ff0c096c957045819551582c725ffefe3fefa2c71d468a5daa0ddabad89e0e
    contract_hash: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
    binding_hash: 5e91ac0957bd40241257a362057f944e248d1b842eaab6234c1afb442c5c30f5
    fingerprint: 175884d2a066bed1a9e6f0067c7285b58a88f934174323665f97859d65f1c52c
    fingerprint_components:
      contract: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
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
      - symbol_id: SYM-proof-closed-requirement-status
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
      test_id: TEST-proof-closed-requirement-status
      pattern:
        symbol_id: SYM-const-closed-requirement-status
        type: string
        value: closed
    certificate_digest: 226cc6702e08f7acc0681e859ad2e16cf87c46fede5a5276caf9418bf85f790d
    claim_bindings:
      - claim_key: CLAIM-DD9D88701148517A
        requirement_id: REQ-cli-migration-pin-codes
        fact_id: FACT-closed-requirement-status
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a superseded requirement shall close with status closed, against the code Kibi reads at ingest.