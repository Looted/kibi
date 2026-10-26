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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e4897aa00c420b724d73801b
    test_id: TEST-opencode-smart-enforcement
    scope: unit
    outcome: passed
    code_snapshot: 07ae48f2c38b491754a50c67ed4626777bd16e4d966faa997328a347a174f946
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T12:37:52.686Z'
    finished_at: '2026-10-25T12:37:52.790Z'
    artifact_digest: 71069f982d75c4ae8be2bf5580a5bd21a797a40291462a249ee15ab1ae1f78c4
    contract_hash: 113b22362747b0a04384c2908a81b60f6b006720fe5537c58f37bf21c4014be7
    binding_hash: 8ac6d7091a10a4517f76dcdc18245ef0a29d68a8317bf0fd2e9a8870d1edd869
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Verify smart enforcement reads typed Kibi status and next actions, routes general work to canonical skills, routes explicit bootstrap requests to kibi-bootstrap, and keeps guidance advisory.
