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
    - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6487bbfc46e5b2bdd325355f
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a50f2c502f50261f2dc53bb28dd92e536697075ad7758a3fe3fd4e599444636
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T13:13:59.642Z'
    finished_at: '2026-10-25T13:15:29.180Z'
    artifact_digest: dad27a3c6009b09d2a8ba0790e604badc5bc746ef7e776552cabbd6c64f265a6
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
    binding_hash: c52ea1d8746f454b419cc1697a4ab4ba56f92689108db7986ddb78418e29e209
    fingerprint: fa64829072a9fe9899f19dcb1c262d911cb2699bd8c6d6c672dc4a9680051440
    fingerprint_components:
      contract: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
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
