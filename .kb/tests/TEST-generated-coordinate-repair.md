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
    - symbol_id: SYM-e2e-test-generated-coordinate-repair
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-cab98547fb97a6827ded74be
    test_id: TEST-generated-coordinate-repair
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: abd02f8d5742c4080d1251cd0065576fa7c5e4fe98a8083465dc491cf22eccc2
    binding_hash: 22d824c83fa454a5e0be7c46240c62d2f7a3fece97bf489c314b86d012caba43
    fingerprint: a9aa7489e5a5bd3b6d157848393c3d60eec3d80584f0d585ea7b8050d0b73c6e
    fingerprint_components:
      contract: abd02f8d5742c4080d1251cd0065576fa7c5e4fe98a8083465dc491cf22eccc2
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
      - symbol_id: SYM-e2e-test-generated-coordinate-repair
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
# Generated coordinate persistence and repair E2E

`packages/cli/tests/commands/symbol-coordinate-repair.test.ts` exercises the real CLI against a branch-local KB: same-value upserts preserve RDF coordinates without authored leakage, plain sync remains a no-op over warm-cache divergence, and the explicit approved refresh restores coordinates with a subsequent true no-op sync.
