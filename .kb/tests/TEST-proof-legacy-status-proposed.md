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
    receipt_id: PR-f9caeaa7cf0f99538e0ca8a6
    test_id: TEST-proof-legacy-status-proposed
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 504991e86a1a6eab0d2bbeed43214444b4c562b0e01a5c1f77d5c560753095a2
    binding_hash: 324153dae8f8a744fd55960432c8dcb746942f862ba2a88f0f9bfcf57eee206f
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