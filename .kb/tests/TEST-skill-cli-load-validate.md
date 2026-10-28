---
id: TEST-skill-cli-load-validate
title: CLI skills commands load and validate the kibi-usage bundle
status: active
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/tests/skills.test.ts
tags:
  - cli
  - skills
  - unit
links:
  - type: validates
    target: SCEN-reusable-skill-subsystem
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skill-cli-load-validate
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-772a490a6f10af094952374b
    test_id: TEST-skill-cli-load-validate
    scope: end_to_end
    outcome: passed
    code_snapshot: d846074bf74573654815f076ec178545839e30bad96b6474414e0f92551f8631
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:13:35.887Z'
    finished_at: '2026-10-28T19:14:39.326Z'
    artifact_digest: 7925080557060ffa3368fe5febaba168aa1ea3c66bb87820f0adce5125855730
    contract_hash: 25aa7403d93d2882485c7bb8fa74e51424ee950fb2d84ca2c2934b794e714271
    binding_hash: bb30f752ea94f0b4d07bb8a02c4c9be1bf0e9ae2273d68ef7e59bd722629fb48
    fingerprint: 0c11bca244dfe5c9af2e5c9b8522204ce11d34549d79e7b43ef707e493b7fa3c
    fingerprint_components:
      contract: 25aa7403d93d2882485c7bb8fa74e51424ee950fb2d84ca2c2934b794e714271
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
      - symbol_id: SYM-e2e-test-skill-cli-load-validate
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
Verifies listing, loading, resource reading, validation failures, and CLI command handling for bundled reusable skills.
