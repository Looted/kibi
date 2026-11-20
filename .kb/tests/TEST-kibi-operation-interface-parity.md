---
id: TEST-kibi-operation-interface-parity
title: Kibi public operation parity verification plan
type: test
status: passing
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-22T00:00:00.000Z
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - mcp
  - cli
  - parity
  - policy
  - test
links:
  - type: validates
    target: SCEN-kibi-operation-interface-parity
  - type: relates_to
    target: ADR-022
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-mcp-cli-operation-parity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-d059779dc1f998e617ce7d55
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 3cbdf32b0ca578c0e6fb1cb36066284a666736978a016aff5518fbb451bb6544
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T04:36:59.867Z'
    finished_at: '2026-11-20T04:38:23.296Z'
    artifact_digest: 0cd115ccb427a256c1cf5fda3cbf99ac8de4fd14bc3f9a4c7ffbad76dc475adc
    contract_hash: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
    binding_hash: 31c64f17529649f8ab8d8043fc969f6f5482d35f8dbcd06a94543895b8bd0bc9
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

- The strict fact lane models the operation surface as exactly 18 peer operations.
- The requirement, scenario, test, and ADR links all resolve without dangling references.
- The docs describe MCP and CLI as peers, not as primary and secondary surfaces.
- The CLI reference enumerates all 18 `--input` routes, object-input rules, exit codes `0`/`1`/`2`, and the canonical `find-gaps` command with its `gaps` alias.
- Symbol coverage includes shared operation executors, CLI protocol modules, CLI/MCP runtime adapters, the Cursor worktree resolver, and the canonical skill generator.
- CLI lifecycle tests prove that pending JSON output drains before the entrypoint requests explicit process termination.
- Remote SPARQL operation, CLI JSON, MCP adapter, and parity tests use a loopback-only HTTP fixture and verify shared decoding, HTTP(S)-only validation, and timeout cancellation without public endpoint access.
