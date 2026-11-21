---
title: The proof integration setup step shall be proof_integration_configure, by a regex proof
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
    - symbol_id: SYM-proof-integration-configure-step
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-proof-integration-configure
  proves:
    - CLAIM-69759DA98345DD8E
origin:
  kind: agent
  recorded_at: '2026-10-28T21:20:42.542Z'
id: TEST-proof-integration-configure-step
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b8ddfacf17b019bd50b52af7
    test_id: TEST-proof-integration-configure-step
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 2a55750779fe393193e4743e6695a1d35b627ba7f555483593f26cdc770b368b
    binding_hash: bf45472aae6fef28f60a7139cf2e4abade6cffc52a9d8a3f3b6e533e7547dd93
    fingerprint: 2a6f9d2bb99e877d2b4051ea9313dbbfa963aeaa3dfe33683804b400d5a8b141
    fingerprint_components:
      contract: 2a55750779fe393193e4743e6695a1d35b627ba7f555483593f26cdc770b368b
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
      - symbol_id: SYM-proof-integration-configure-step
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
      test_id: TEST-proof-integration-configure-step
      pattern:
        symbol_id: SYM-const-proof-integration-configure
        type: string
        value: proof_integration_configure
    certificate_digest: ada25c527c2af70890e48b0d49a702f24d730cbf073c67d24073175d98a10d48
    claim_bindings:
      - claim_key: CLAIM-69759DA98345DD8E
        requirement_id: REQ-kibi-proof-receipt-format
        fact_id: FACT-integration-configure-step
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: proof_integration_configure
---
Proves that the proof integration setup step shall be proof_integration_configure, against the code Kibi reads at ingest.