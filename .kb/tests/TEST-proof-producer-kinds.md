---
title: A proof producer shall be command, playwright, junit or tap, by an exhaustive proof
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
    - symbol_id: SYM-proof-producer-kinds
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-producer-kinds
  proves:
    - CLAIM-5FD532ADAFB84B98
origin:
  kind: agent
  recorded_at: '2026-10-28T17:49:10.272Z'
id: TEST-proof-producer-kinds
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-584c650c995876024f075f14
    test_id: TEST-proof-producer-kinds
    scope: unit
    outcome: passed
    code_snapshot: 687a75b3c57bd11cbd5b1b79fcfa7589e153fe88b2edd678594f1eb4f347fdda
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:11:44.143Z'
    finished_at: '2026-11-16T11:13:25.311Z'
    artifact_digest: f79044ea9b4e1d539c65f539f226328db9b08c254176cc9b90d70a7f30e8803c
    contract_hash: f97c58d5f1222f3e7764f6677b196c8c39322fe0d3abae438ce2aac0b9e5124d
    binding_hash: 9c52a8b095b1285369e97a43281fb8300dea2579e66bed3a7ca5d4ec7a957d4f
    fingerprint: 0593db2ee6f61bf194b6b51f0baf1902005c1ab63b7dcd9a34137f7bc95e70d3
    fingerprint_components:
      contract: f97c58d5f1222f3e7764f6677b196c8c39322fe0d3abae438ce2aac0b9e5124d
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
      - symbol_id: SYM-proof-producer-kinds
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
      test_id: TEST-proof-producer-kinds
      domain:
        symbol_id: SYM-producer-kinds
        members:
          - command
          - playwright
          - junit
          - tap
      results:
        - member: command
          outcome: passed
        - member: playwright
          outcome: passed
        - member: junit
          outcome: passed
        - member: tap
          outcome: passed
    certificate_digest: 7ea349e71b1a0814c105fac9380f9544008ede78ff1e2195732bed8c9da2e6dc
    claim_bindings:
      - claim_key: CLAIM-5FD532ADAFB84B98
        requirement_id: REQ-kibi-proof-producers-and-storage
        fact_id: FACT-producer-kinds
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - command
            - junit
            - playwright
            - tap
---
Proves that a proof producer shall be command, playwright, junit or tap, against the code Kibi reads at ingest.