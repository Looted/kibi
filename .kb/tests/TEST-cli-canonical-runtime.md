---
title: CLI unit tests prove canonical discovery, authoring, and ignore policy
status: passing
tags:
  - cli
  - canonical-layout
verification_scope: end_to_end
verification_perspective: internal
text_ref: packages/cli/tests/commands/sync/discovery.test.ts
id: TEST-cli-canonical-runtime
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
    receipt_id: PR-1d9ed2740d6e29fba6565ce1
    test_id: TEST-cli-canonical-runtime
    scope: end_to_end
    outcome: passed
    code_snapshot: c469764ad7d851a4a824eb1c7ddea2723a5cdfcfa3a999d51640bc4d746102ef
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-23T18:58:59.466Z'
    finished_at: '2026-11-23T19:02:07.640Z'
    artifact_digest: e68e0c6fa01d508f6e238bb3eb17b60b9235b74706b7057b8728e580370f62cd
    contract_hash: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
    binding_hash: 9f9b83c218b4f5e9845a50e7489cc4b4e807383d9f34c4cf2a6b235dfcdbc268
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
Unit coverage lives in `packages/cli/tests/commands/sync/discovery.test.ts`, `packages/cli/tests/operations/source-authoring.test.ts`, `packages/cli/tests/public/ignore-policy.test.ts`, and `packages/cli/tests/traceability/git-staged.test.ts`.
