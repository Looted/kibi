---
id: TEST-agent-kibi-interface-selection
title: Agent guidance surface selection verification plan
type: test
status: pending
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-21T00:00:00.000Z
priority: must
tags:
  - opencode
  - agent
  - mcp
  - cli
  - policy
  - test
links:
  - type: validates
    target: SCEN-agent-kibi-interface-selection
  - type: relates_to
    target: ADR-022
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-agent-kibi-interface-selection
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7aaac9fb344b9f060a7aaf31
    test_id: TEST-agent-kibi-interface-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a50f2c502f50261f2dc53bb28dd92e536697075ad7758a3fe3fd4e599444636
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T13:15:34.358Z'
    finished_at: '2026-10-25T13:16:00.066Z'
    artifact_digest: 458d106c7a2f3aa4ec178f81fe12ca841caf510b86faee56916b42774b4f8d0a
    contract_hash: 681a9eb47ecf14fac4d635d33e4467a6977aba74d54f412c8b972832715503e1
    binding_hash: 90e3b4ae8c000d235c2cb810968da49e0b2d199905d7e180df05d47c9acaab54
    fingerprint: 816c3ffe046dbf2f4fc6fcff2172a8f1c89b184ae848a7852fceaacd82be8a17
    fingerprint_components:
      contract: 681a9eb47ecf14fac4d635d33e4467a6977aba74d54f412c8b972832715503e1
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
      - symbol_id: SYM-e2e-test-agent-kibi-interface-selection
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
## Test Coverage

### Policy Checks

- The new requirement supersedes the older MCP-only guidance by link, not by rewriting history.
- Agent-facing docs keep both public surfaces available in the traceability graph.
- The scenario proves guidance can point to a peer surface without claiming exclusivity.
