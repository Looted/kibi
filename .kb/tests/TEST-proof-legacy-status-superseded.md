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
    receipt_id: PR-e26e9935f2253ff77037a43d
    test_id: TEST-proof-legacy-status-superseded
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 8312b01dc8901b10e67445910ed7568f39dcdd013f530ea4e86cd3171561907f
    binding_hash: decbab3a028afcae8f28781d840182fac0d7c578b70aa4fdcf552e6d7cf66756
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