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
    - symbol_id: SYM-e2e-init-sync-check
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-15389f9816491f1ac3c56854
    test_id: TEST-cli-canonical-init
    scope: end_to_end
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:19:24.011Z'
    finished_at: '2026-11-10T15:19:51.599Z'
    artifact_digest: 455aa2e2dfffa61806ec14434c44f804470dbbec1231f9e75e59ccf541b4b8a5
    contract_hash: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
    binding_hash: a0941cf4e901bc2f91a9d6d32590318a5bc0f5ca4e093064e13d925952edcda9
    fingerprint: b306bd9de40a1467df2971230e0d6da3dddf85f413772e7f94361ed531556ac1
    fingerprint_components:
      contract: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
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
      - symbol_id: SYM-e2e-init-sync-check
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
Unit coverage in `packages/cli/tests/commands/init.test.ts` asserts that `kibi init` writes `.kb/manifest.json`, does not write `.kb/config.json`, and gitignores derived `.kb/` runtime trees.
