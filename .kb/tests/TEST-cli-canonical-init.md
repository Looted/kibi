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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-621579514021f77dbbe597dc
    test_id: TEST-cli-canonical-init
    scope: end_to_end
    outcome: passed
    code_snapshot: a7ee6e75591f23c8003fd7cb5df9dc7fcc2863290a587f8517f61d409fca336c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T22:36:21.304Z'
    finished_at: '2026-10-28T22:37:24.513Z'
    artifact_digest: 80118b270dcb561c176221cd51a53a316c2ffcd78b3f1e82a1cdb7bca63dda03
    contract_hash: f0336a97461e249c8341c463b551646ea0e5e557840e9150ea0dc07a8fe2a693
    binding_hash: 7047ce9025cbb24bf4edbb473dc605e595fb9f19c4dee20ab76f94d2baca0019
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Unit coverage in `packages/cli/tests/commands/init.test.ts` asserts that `kibi init` writes `.kb/manifest.json`, does not write `.kb/config.json`, and gitignores derived `.kb/` runtime trees.
