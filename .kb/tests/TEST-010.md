---
id: TEST-010
title: Core MCP surface excludes internal inference tools
status: passing
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
    - symbol_id: SYM-e2e-traceability-gate
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e3952a8c2030fb471ddb3467
    test_id: TEST-010
    scope: end_to_end
    outcome: passed
    code_snapshot: b95fa37681e8a263f7711717a0c81ed6eb85ba81a6d11a9483e6acc81f4800fc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T15:11:46.911Z'
    finished_at: '2026-11-10T15:13:25.544Z'
    artifact_digest: 57469188d6de1c899a27423d91e387395ff7cc10c1256f20da8fc42166fd61c3
    contract_hash: 4aec9506817a436c165d45b6f98b89f91f5981d26ccd4c93f30012638a228261
    binding_hash: bf1a0e2ab5cb676e2dc2a09dd7d890996b0076e4347fcfecd9dfd1b4cc40fab1
    fingerprint: 4a1e8f59e1dbcd9cd5d560644a3aec18a1a78539d29fb04c8637454ab433c0f7
    fingerprint_components:
      contract: 4aec9506817a436c165d45b6f98b89f91f5981d26ccd4c93f30012638a228261
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
      - symbol_id: SYM-e2e-traceability-gate
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
Verify that the public MCP catalog advertises the approved read, validation, mutation, bootstrap-planning, and briefing operations, while internal inference helpers remain unadvertised. Bootstrap uses kb_plan_bootstrap and kb_apply_plan with exact plan approval.
