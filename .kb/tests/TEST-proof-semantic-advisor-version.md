---
title: The semantic advisor version shall be semantic-advisor-v2, by a regex proof
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
    - symbol_id: SYM-proof-semantic-advisor-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-SEMANTIC_ADVISOR_VERSION
  proves:
    - CLAIM-38D29BB8E64E19E3
origin:
  kind: agent
  recorded_at: '2026-10-28T19:15:16.342Z'
id: TEST-proof-semantic-advisor-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-30525f9cdd4039c7cfc48e67
    test_id: TEST-proof-semantic-advisor-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 927e57b1f1757de38b94a3f3dfc511afcb7738c306814fbc3dba525133c9d228
    binding_hash: 5a6da57c8341fa42b7f3fd7118cdb873e52bbabfdc711b168461283757a4ab07
    fingerprint: 0cbbc8028565b5eb5115e2f1f5aa701422477846012285eb390fdf89fb51c075
    fingerprint_components:
      contract: 927e57b1f1757de38b94a3f3dfc511afcb7738c306814fbc3dba525133c9d228
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
      - symbol_id: SYM-proof-semantic-advisor-version
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
      test_id: TEST-proof-semantic-advisor-version
      pattern:
        symbol_id: SYM-SEMANTIC_ADVISOR_VERSION
        type: string
        value: semantic-advisor-v2
    certificate_digest: ec03845be279336c7dc86de75871e38158458c0f080e34dced54e1e060e42924
    claim_bindings:
      - claim_key: CLAIM-38D29BB8E64E19E3
        requirement_id: REQ-semantic-advisor-version
        fact_id: FACT-semantic-advisor-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: semantic-advisor-v2
---
Proves that the semantic advisor version shall be semantic-advisor-v2, against the code Kibi reads at ingest.