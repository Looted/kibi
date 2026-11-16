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
    receipt_id: PR-fbbfb766420810ff2752b892
    test_id: TEST-proof-integration-configure-step
    scope: unit
    outcome: passed
    code_snapshot: 687a75b3c57bd11cbd5b1b79fcfa7589e153fe88b2edd678594f1eb4f347fdda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:11:44.143Z'
    finished_at: '2026-11-16T11:13:25.311Z'
    artifact_digest: f79044ea9b4e1d539c65f539f226328db9b08c254176cc9b90d70a7f30e8803c
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