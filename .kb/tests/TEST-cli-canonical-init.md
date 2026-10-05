---
title: Init unit tests prove canonical layout
status: passing
tags:
  - cli
  - init
  - canonical-layout
verification_scope: end_to_end
verification_perspective: internal
id: TEST-cli-canonical-init
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cli-canonical-init
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-dc2db0330748b006c6d257e0
    test_id: TEST-cli-canonical-init
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: f0336a97461e249c8341c463b551646ea0e5e557840e9150ea0dc07a8fe2a693
    binding_hash: c3c78aac3b1580f61ea6d366c80f5185b0e42d14f7e9b9c7cce94869c855dfc4
    fingerprint: 2386a4203ece7377b464400025e46eec9d924b44db71c44b738cab5056fc4cca
    fingerprint_components:
      contract: f0336a97461e249c8341c463b551646ea0e5e557840e9150ea0dc07a8fe2a693
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
      - symbol_id: SYM-e2e-test-cli-canonical-init
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Unit coverage in `packages/cli/tests/commands/init.test.ts` asserts that `kibi init` writes `.kb/manifest.json`, does not write `.kb/config.json`, and gitignores derived `.kb/` runtime trees.
