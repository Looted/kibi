---
id: TEST-012
title: kb_query supports sourceFile filtering for linked entities
status: passing
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
    - symbol_id: SYM-e2e-init-sync-check
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4e5d7f34438ea28902582c98
    test_id: TEST-012
    scope: end_to_end
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:17:14.455Z'
    finished_at: '2026-11-10T15:17:41.388Z'
    artifact_digest: 889375d5f1ce2ffeb89c1bb72d7bd5c334b274c0e6c59c6a782a8c153bbd139e
    contract_hash: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
    binding_hash: 5d744bcb404f1b41fca922f6757d0c0e40a6e7a644ca514d35fdee07869003a3
    fingerprint: b306bd9de40a1467df2971230e0d6da3dddf85f413772e7f94361ed531556ac1
    fingerprint_components:
      contract: 4aeddfd893b85de667338165458ac8dfc908d633d6a4117ff137a3fd26d0f919
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
      - symbol_id: SYM-e2e-init-sync-check
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
Validation steps:
1. Seed KB entities with `source` values matching a project file path.
2. Call `kb_query` with `sourceFile` set to that path substring.
3. Verify the matching entities are returned in deterministic order.
