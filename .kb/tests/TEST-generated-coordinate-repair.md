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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-76edc4b2573219eebefe0b0d
    test_id: TEST-generated-coordinate-repair
    scope: end_to_end
    outcome: passed
    code_snapshot: ac909ff52412d46a423958b88002491f7617fe6f316b2554d008e1895ca6059b
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:14:05.537Z'
    finished_at: '2026-10-28T11:15:14.470Z'
    artifact_digest: cc059faaaf4ec0c67a0384353768de80d8ad789cda4ba4049cf32494d95c1ea3
    contract_hash: abd02f8d5742c4080d1251cd0065576fa7c5e4fe98a8083465dc491cf22eccc2
    binding_hash: d5b5ae09fc403a310cf9262013ff0bba2ebe06592f3272410fcf0e76002b4156
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Generated coordinate persistence and repair E2E

`packages/cli/tests/commands/symbol-coordinate-repair.test.ts` exercises the real CLI against a branch-local KB: same-value upserts preserve RDF coordinates without authored leakage, plain sync remains a no-op over warm-cache divergence, and the explicit approved refresh restores coordinates with a subsequent true no-op sync.
