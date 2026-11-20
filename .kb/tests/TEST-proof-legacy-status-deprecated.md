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
    receipt_id: PR-e73ae49aee26034d0edfc18f
    test_id: TEST-proof-legacy-status-deprecated
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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