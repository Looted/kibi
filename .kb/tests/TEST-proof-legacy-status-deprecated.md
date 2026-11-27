---
title: A requirement marked deprecated shall be migrated as retired, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-deprecated
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.deprecated
  proves:
    - CLAIM-38995D2450ABEABA
origin:
  kind: agent
  recorded_at: '2026-10-29T10:42:08.423Z'
id: TEST-proof-legacy-status-deprecated
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e483dc9822f1979a7a6ba3d8
    test_id: TEST-proof-legacy-status-deprecated
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: cf2827d1f85cee0fa8868342786ff43a9a92bdfc14a168c24d85ec23a8c52667
    binding_hash: 33de9e238ad65ab5f514db2a1af93615af75114614f994b46a2d74170ef9702a
    fingerprint: 909890b841660e323e095c09cff120dde43f9b85c07667addbcaa0f04268f098
    fingerprint_components:
      contract: cf2827d1f85cee0fa8868342786ff43a9a92bdfc14a168c24d85ec23a8c52667
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
      - symbol_id: SYM-proof-legacy-status-deprecated
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
      test_id: TEST-proof-legacy-status-deprecated
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: retired
    certificate_digest: cdcc67388d406e1a9cf7eee7ac607261d76b6104f247027dac444cd3dbf34543
    claim_bindings:
      - claim_key: CLAIM-38995D2450ABEABA
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-deprecated
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: retired
---
Proves that a requirement marked deprecated shall be migrated as retired, against the code Kibi reads at ingest.