---
id: TEST-010
title: Core MCP surface excludes internal inference tools
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-04-24T08:12:00.000Z
priority: must
tags:
  - mcp
  - inference
  - integration
links:
  - type: validates
    target: SCEN-008
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-010
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-517ee1205dfb8752003b69e8
    test_id: TEST-010
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 1a2dc8b6dab37b05ad993c3fa0c2903586836dcfd00ee4ed2637b08d16eb3b22
    binding_hash: a44c4731a14f0b27ba87286b3d659c705b6d70365bdf0d8ce3285a19fa17017a
    fingerprint: 9786dd814461dde07ca99afa0b32bc2ace6f13b2ab85ec319bfd966d549f646a
    fingerprint_components:
      contract: 1a2dc8b6dab37b05ad993c3fa0c2903586836dcfd00ee4ed2637b08d16eb3b22
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
      - symbol_id: SYM-e2e-test-010
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
Verify that the public MCP catalog advertises the approved read, validation, mutation, bootstrap-planning, and briefing operations, while internal inference helpers remain unadvertised. Bootstrap uses kb_plan_bootstrap and kb_apply_plan with exact plan approval.
