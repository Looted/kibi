---
id: TEST-012
title: kb_query supports sourceFile filtering for linked entities
status: active
created_at: 2026-02-20T10:35:00.000Z
updated_at: 2026-02-20T10:35:00.000Z
priority: must
tags:
  - mcp
  - context
links:
  - type: validates
    target: REQ-mcp-tool-query
  - type: validates
    target: SCEN-mcp-tool-query
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-012
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-80a400574451489caadbf4fe
    test_id: TEST-012
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: bca81a1b5c8493d4567cf823c2da3e46809b51250715050d3d27eab1a8564029
    binding_hash: ffa9c325252035d44e86ee84d360204101b63c29b9642b57712bc2611689926c
    fingerprint: 5a728f314da3f5a32ce68601f04e727449cb7a1c14fd6ac6638255834fb3c2e3
    fingerprint_components:
      contract: bca81a1b5c8493d4567cf823c2da3e46809b51250715050d3d27eab1a8564029
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
      - symbol_id: SYM-e2e-test-012
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
Validation steps:
1. Seed KB entities with `source` values matching a project file path.
2. Call `kb_query` with `sourceFile` set to that path substring.
3. Verify the matching entities are returned in deterministic order.
