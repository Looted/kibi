---
id: TEST-agent-kibi-interface-selection
title: Agent guidance surface selection verification plan
type: test
status: passing
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
    - symbol_id: SYM-e2e-mcp-cli-operation-parity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-741c054e8c542ba0c2f964a5
    test_id: TEST-agent-kibi-interface-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
    binding_hash: 367168c9ca5a466fab3e11f91165178f8ed6aa7c8d23f4bd47f4a6a59c407e69
    fingerprint: 10eff81d0bc3303e3c216878cb7d8d04f482e9e8c5fedb54c67b66ea0199712f
    fingerprint_components:
      contract: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
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
      - symbol_id: SYM-e2e-mcp-cli-operation-parity
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
