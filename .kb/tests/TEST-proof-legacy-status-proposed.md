---
title: A requirement marked proposed shall be migrated as open, by a regex proof
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
    - symbol_id: SYM-proof-legacy-status-proposed
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-migration-suggested-requirement-status
    export: SUGGESTED_REQUIREMENT_STATUS.proposed
  proves:
    - CLAIM-68AFEA49B161D179
origin:
  kind: agent
  recorded_at: '2026-10-29T10:40:56.623Z'
id: TEST-proof-legacy-status-proposed
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c6b4a440d855194ed5e47d3e
    test_id: TEST-proof-legacy-status-proposed
    scope: unit
    outcome: passed
    code_snapshot: faf065f2781c1044c030ed22ef2de1f9fa5ba7e2c43b903b7407837a816cfb65
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T10:44:47.267Z'
    finished_at: '2026-10-29T10:44:47.572Z'
    artifact_digest: ee773fc6ccfa5ef9342b28fcba56ba311e72993196734f57f775208d0d02bcda
    contract_hash: 504991e86a1a6eab0d2bbeed43214444b4c562b0e01a5c1f77d5c560753095a2
    binding_hash: 167d1493b7fbbb79ecc8d6daf37835e6175c690464798f875ea282cefe559a0a
    fingerprint: 7a905b963048144b0f7fd595c5939789a3f0b80cb427c95c9e9afd918bb8d934
    fingerprint_components:
      contract: 504991e86a1a6eab0d2bbeed43214444b4c562b0e01a5c1f77d5c560753095a2
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
      - symbol_id: SYM-proof-legacy-status-proposed
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
      test_id: TEST-proof-legacy-status-proposed
      pattern:
        symbol_id: SYM-migration-suggested-requirement-status
        type: string
        value: open
    certificate_digest: 7546d80c8c6400da9ae3a4ef0bb5313edd81c704e06689a40c6d09a4c933c8e2
    claim_bindings:
      - claim_key: CLAIM-68AFEA49B161D179
        requirement_id: REQ-cli-migration-suggested-status
        fact_id: FACT-legacy-status-proposed
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: open
---
Proves that a requirement marked proposed shall be migrated as open, against the code Kibi reads at ingest.