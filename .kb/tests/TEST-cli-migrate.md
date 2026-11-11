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
    receipt_id: PR-64d4fb9e5dc923da6ff68932
    test_id: TEST-cli-migrate
    scope: end_to_end
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:27:05.144Z'
    finished_at: '2026-11-04T18:27:07.190Z'
    artifact_digest: 914d2508e5c11bde882aca973ce37d5da46970411252003fb4f865f44b497c7a
    contract_hash: efcba361d12e6bd0b6b9b2f0f2968b0ed570e1c852137e4c76d928e879522789
    binding_hash: bb7b29d7eb42f211746f26b68f75bd80d90fe51951fd1bb007975eb41170026d
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
