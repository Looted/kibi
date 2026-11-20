---
id: TEST-cli-migrate
title: CLI migration command unit tests
status: passing
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-06-08T00:00:00.000Z
source: packages/cli/tests/commands/migrate.test.ts
tags:
  - cli
  - migration
  - schema
  - unit
links:
  - type: validates
    target: SCEN-cli-migrate
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-migrate
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e9434a5e9e34301dbf16cf16
    test_id: TEST-cli-migrate
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: efcba361d12e6bd0b6b9b2f0f2968b0ed570e1c852137e4c76d928e879522789
    binding_hash: aa89235a070aa009f7e1029f07873831d399a3935751a5639316522b0d39b272
    fingerprint: 780b43954075cf42305ee9c49ba240bd4b28b390deacb110772e86dd168b6d1f
    fingerprint_components:
      contract: efcba361d12e6bd0b6b9b2f0f2968b0ed570e1c852137e4c76d928e879522789
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
      - symbol_id: SYM-e2e-test-cli-migrate
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verifies that the CLI migration command reports schema migrations in dry-run mode and exercises the command path that applies branch KB schema updates safely, including the semantic-advisor backfill marker written for migrated KBs.
