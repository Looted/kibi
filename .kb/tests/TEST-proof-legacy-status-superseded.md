---
title: A requirement marked superseded shall be migrated as closed, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-superseded
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.superseded
  proves:
    - CLAIM-11F2D31BA4DA22EE
origin:
  kind: agent
  recorded_at: '2026-10-29T10:42:44.538Z'
id: TEST-proof-legacy-status-superseded
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-34353b0c2be871ba3f198743
    test_id: TEST-proof-legacy-status-superseded
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:45:25.211Z'
    finished_at: '2026-10-29T10:45:25.461Z'
    artifact_digest: 25219971dcc7a008c268863452efe7088b59e69cf1558ace7119d06b387d5cc5
    contract_hash: 8312b01dc8901b10e67445910ed7568f39dcdd013f530ea4e86cd3171561907f
    binding_hash: 91ff07a9739024c74399eb09f53825d325ab93eb27b935208c9be7d5ed2874f3
    fingerprint: b023eeea6518ced0c431e1194b4572c3620d7c9635b0ac9511d91ac24ffd77fd
    fingerprint_components:
      contract: 8312b01dc8901b10e67445910ed7568f39dcdd013f530ea4e86cd3171561907f
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
      - symbol_id: SYM-proof-legacy-status-superseded
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
      test_id: TEST-proof-legacy-status-superseded
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: closed
    certificate_digest: f09edc787e83527204c48657201556c89cad2a824db420ada6f3d42ca30cf8a5
    claim_bindings:
      - claim_key: CLAIM-11F2D31BA4DA22EE
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-superseded
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: closed
---
Proves that a requirement marked superseded shall be migrated as closed, against the code Kibi reads at ingest.