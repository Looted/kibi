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
    receipt_id: PR-a7ea59683da75cae540b7877
    test_id: TEST-cli-migrate
    scope: end_to_end
    outcome: passed
    code_snapshot: dc0be4d5803f22ca38ce1004b6769d2368029ae49edea82620e6c6618cbf4d3a
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T18:51:20.638Z'
    finished_at: '2026-10-28T18:52:31.449Z'
    artifact_digest: 737b6846fbd4ea4335a4dad2cac575a297f3cbeaea054159dd5adbb9ec325668
    contract_hash: efcba361d12e6bd0b6b9b2f0f2968b0ed570e1c852137e4c76d928e879522789
    binding_hash: 207ef8400837c83cf1be690c08da6072d6d2e32ca5750eebd35dc2b01427ca3b
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
