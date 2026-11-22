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
    receipt_id: PR-fd2fa75359025af416f3dad5
    test_id: TEST-proof-closed-requirement-status
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 1c221425b531f2bc0c0476ad8d60bff704b4c2589e857219a0dd90aa517419a4
    binding_hash: 07e55775c4c776d1566de3da1dc32148aaf2e30d97bc0534c8fcf5998e06bab5
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
        requirement_id: REQ-cli-migration-supersession-codes
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