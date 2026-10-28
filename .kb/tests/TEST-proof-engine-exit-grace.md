---
title: The engine shall give Prolog 1000 milliseconds to exit, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-engine-exit-grace
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-const-engine-prolog-exit-grace-ms
  proves:
    - CLAIM-9393D46F1A874F0D
origin:
  kind: agent
  recorded_at: '2026-10-28T20:46:32.808Z'
id: TEST-proof-engine-exit-grace
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1dc2f1cab8dd2c3e0be7f944
    test_id: TEST-proof-engine-exit-grace
    scope: unit
    outcome: passed
    code_snapshot: 472ab5fec1aec3e1a51b0737292ab57b9f9942730f32135112f3d58b2f27ee34
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:47:29.038Z'
    finished_at: '2026-10-28T20:47:29.162Z'
    artifact_digest: 864b693045fd74dee1378136a4799b83e8593a2f3d92574251e4c0c3a4ddc2d1
    contract_hash: 6d4dcd2eade2841a2bc5399dbab0ddab23b4513b01328a1cdb7a2526ab950d0d
    binding_hash: 9d1be84bf244cca5430ac632ac6405374421e55242fcd16669fab74bd5f5f6e6
    fingerprint: 5dd119ecb5a79451639ca8b331aaeb955feb1e44fcf0300e2b53f02ee6bf2172
    fingerprint_components:
      contract: 6d4dcd2eade2841a2bc5399dbab0ddab23b4513b01328a1cdb7a2526ab950d0d
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
      - symbol_id: SYM-proof-engine-exit-grace
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-engine-exit-grace
      variable: exit_grace_ms
      value_type: int
      assumptions:
        - operator: eq
          value: 1000
      claim:
        operator: eq
        value: 1000
    certificate_digest: 7004f5efea8c3bc26adfd7cbebefc976c1566a3970354baad9ff2b2f88f25678
    claim_bindings:
      - claim_key: CLAIM-9393D46F1A874F0D
        requirement_id: REQ-engine-timing-settings
        fact_id: FACT-engine-exit-grace
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 1000
          value_type: int
          variable: exit_grace_ms
---
Proves that the engine shall give Prolog 1000 milliseconds to exit, against the code Kibi reads at ingest.