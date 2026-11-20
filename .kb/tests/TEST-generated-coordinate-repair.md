---
title: Generated coordinate persistence and repair E2E
status: passing
id: TEST-generated-coordinate-repair
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-source-relationship-parity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e874ba5d136b137ad0985a27
    test_id: TEST-generated-coordinate-repair
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 30efd2e8b483afc8b190ec3627b46645c2b760e58a48372c15e853ca18b4cf23
    binding_hash: d3ce6028e4ca796b2a1a52ea7c4d10f0cb9229770459fa6b6d730fb9e00571a3
    fingerprint: 21d469418c2a2c6e33dc4553ae7dcafe22d6a9f67c4c3f22bf083a97bbf51068
    fingerprint_components:
      contract: 30efd2e8b483afc8b190ec3627b46645c2b760e58a48372c15e853ca18b4cf23
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
      - symbol_id: SYM-e2e-source-relationship-parity
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
# Generated coordinate persistence and repair E2E

`packages/cli/tests/commands/symbol-coordinate-repair.test.ts` exercises the real CLI against a branch-local KB: same-value upserts preserve RDF coordinates without authored leakage, plain sync remains a no-op over warm-cache divergence, and the explicit approved refresh restores coordinates with a subsequent true no-op sync.
