---
id: TEST-opencode-smart-enforcement
title: Smart Enforcement Verification and Surface Policy
type: test
status: passing
created_at: 2026-04-03T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - enforcement
  - opencode
  - kibi
  - test
links:
  - type: validates
    target: SCEN-opencode-smart-enforcement
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-smart-enforcement
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-94c0654939394ddf23bdb54c
    test_id: TEST-opencode-smart-enforcement
    scope: unit
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 113b22362747b0a04384c2908a81b60f6b006720fe5537c58f37bf21c4014be7
    binding_hash: be22d2d2e6e49e8a61bd5dfb42b50bca3e5efaac92e5bd18922f87147e838787
    fingerprint: 28dcaa3947b34c8b9f8da049adc44fb465cf12664f39ba577556b010c1ec1a7a
    fingerprint_components:
      contract: 113b22362747b0a04384c2908a81b60f6b006720fe5537c58f37bf21c4014be7
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
      - symbol_id: SYM-e2e-test-opencode-smart-enforcement
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
Verify smart enforcement reads typed Kibi status and next actions, routes general work to canonical skills, routes explicit bootstrap requests to kibi-bootstrap, and keeps guidance advisory.
