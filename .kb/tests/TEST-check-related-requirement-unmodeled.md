---
title: related-requirement-unmodeled rule tests
status: active
priority: must
tags:
  - checks
  - contradictions
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-check-related-requirement-unmodeled
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-07T13:24:04.730Z'
id: TEST-check-related-requirement-unmodeled
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f503d58c235c3d32f4d23b0b
    test_id: TEST-check-related-requirement-unmodeled
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e892e32663638590c7ad9a8573b8cf078c3ec3e39d977dccb8891ee65a455f4
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-07T13:50:42.856Z'
    finished_at: '2026-10-07T13:50:47.322Z'
    artifact_digest: f5fac60da4ace5d4daa6bee7a297aca1c5bc2115d12482d4dc09dbfb1c39f998
    contract_hash: e73ace1f60266e662ffc556fb0fda57f85e52802f13951c19de1e2929c48d4ca
    binding_hash: 6c561311274d65fa7c1106b9d8dec5dead7655df97486e12be06a61c0765c97f
    fingerprint: 9e932ecc415ede74275090d026138cd473a2a67f922e5a10c4f78eab84ee684c
    fingerprint_components:
      contract: e73ace1f60266e662ffc556fb0fda57f85e52802f13951c19de1e2929c48d4ca
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
      - symbol_id: SYM-test-check-related-requirement-unmodeled
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the consumer test `packages/cli/tests/consumer/related-requirement-unmodeled.test.ts` through the built CLI: it authors a modeled requirement, a new requirement with an advisor ledger left as missing and a relates_to link, syncs, and asserts the default `kibi check` run reports the blocking violation naming the modeled keys, then that a supersedes link clears it. The Prolog unit tests in `packages/core/tests/kb.plt` (checks_coverage_gaps) cover both link directions, predicate-modeled neighbours, and the ledgerless, classified and superseded cases.