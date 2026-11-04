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
    receipt_id: PR-65891a2ff73fc36d14aad271
    test_id: TEST-agent-kibi-interface-selection
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ed5ab55b3c5d386434b8837b93f63ec6797d0dd5bf2b248a10008d63b41039a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T13:31:12.784Z'
    finished_at: '2026-11-04T13:31:42.441Z'
    artifact_digest: fc404e38ec46353316c3447a470411c52f1cb2e1fe44b2f57e0525547742a621
    contract_hash: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
    binding_hash: f765254a293e49e8effea98c86a6e992d762872f0f18cf6c5b817c2458464c3a
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
