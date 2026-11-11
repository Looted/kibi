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
    receipt_id: PR-2e461fd9cbb592b686737d23
    test_id: TEST-generated-coordinate-repair
    scope: end_to_end
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:25:31.248Z'
    finished_at: '2026-11-04T18:26:56.107Z'
    artifact_digest: 93b9c85fd0ab554fdf2d9cd0f487ea5b2e01d89a67bc10a3acbae302fec85c81
    contract_hash: 30efd2e8b483afc8b190ec3627b46645c2b760e58a48372c15e853ca18b4cf23
    binding_hash: 73125906dc6a6d901c344d67e1ae6c08bec040d8a94d07f2950559545012b528
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
