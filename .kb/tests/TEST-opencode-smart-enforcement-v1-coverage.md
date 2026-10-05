---
id: TEST-opencode-smart-enforcement-v1-coverage
title: Verify posture-aware OpenCode smart enforcement
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
links:
  - type: validates
    target: REQ-opencode-smart-enforcement-v1
  - type: validates
    target: SCEN-opencode-smart-enforcement-v1-coverage
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-smart-enforcement-v1-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-8b842a5bb67f1521e5fddb01
    test_id: TEST-opencode-smart-enforcement-v1-coverage
    scope: unit
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 248bc2881607f2fc1794dc9a39001d6d508d7ff1a2b8bd45b5355f34dfe035d1
    binding_hash: b6d06b20de6cafdc64d92ba6f08d732283651694990035f8a43e7222b8648a2a
    fingerprint: c30a4c2244aa47fda85e5b03d9ac16d2e3670d97fa98dca4e5902f5097ec2666
    fingerprint_components:
      contract: 248bc2881607f2fc1794dc9a39001d6d508d7ff1a2b8bd45b5355f34dfe035d1
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
      - symbol_id: SYM-e2e-test-opencode-smart-enforcement-v1-coverage
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
Run smart-enforcement cases for safe and risky edits and assert contextual guidance, sanctioned briefing routing, and bounded token noise.
