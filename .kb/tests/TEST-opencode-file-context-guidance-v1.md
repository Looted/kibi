---
id: TEST-opencode-file-context-guidance-v1
title: Verification of Lifecycle Events and E2E Evidence
type: test
status: passing
created_at: 2026-05-04T10:00:00.000Z
updated_at: 2026-05-04T10:00:00.000Z
source: .kb/requirements/REQ-opencode-file-context-guidance-v1.md
priority: must
tags:
  - opencode
  - guidance
  - e2e
  - test
links:
  - type: validates
    target: SCEN-opencode-file-context-guidance-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-file-context-guidance-v1
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2430e2ab91914bde5865c115
    test_id: TEST-opencode-file-context-guidance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 26529bf139028fe7a629b15a91caf878fa1888f6deb861df095e16b7fc022501
    binding_hash: e9fcd85069768471c80ed9ad26afc97489b9b915de108071e4d5c482f6af8643
    fingerprint: 43caae686b44da99da316ea24f926007c9fd8678cf4c269908ffb75b97faf933
    fingerprint_components:
      contract: 26529bf139028fe7a629b15a91caf878fa1888f6deb861df095e16b7fc022501
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
      - symbol_id: SYM-e2e-test-opencode-file-context-guidance-v1
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

### 1. Lifecycle Event Hooking
- **Unit Tests** (`packages/opencode/tests/file-operation-state.test.ts`, `packages/opencode/tests/file-operation-reminders.test.ts`):
  - `file-operation-state.test.ts`: Asserts that `file.created`, `file.edited`, and `file.deleted` events are tracked and trigger state transitions.
  - `file-operation-reminders.test.ts`: Verifies that guidance is suppressed for `vendored_only` or `root_uninitialized` postures, and session-based suppression after the first hit per path.

### 2. E2E Evidence Logic
- **Unit Tests** (`packages/opencode/tests/e2e-coverage-signals.test.ts`):
  - Asserts that `covered_by` links to entities with `tags: [e2e]` are treated as authoritative.
  - Asserts that `covered_by` links to entities with `source` under `/e2e/` are treated as authoritative.
  - Verifies that heuristic path-matching results in soft-worded advisory text.
  - Verifies that package-level umbrella tests do not trigger "authoritative evidence" flags.

### 3. Prompt Integration
- **Unit Test** (`packages/opencode/tests/prompt.test.ts`):
  - Asserts that lifecycle guidance is merged into the single-block prompt output.
  - Verifies that `RiskClass` is not mutated by lifecycle events (lifecycle is a modifier).

### 4. Integration
- **Integration Test** (`packages/opencode/tests/index.test.ts`):
  - Verifies the full flow from host event to prompt injection in a simulated OpenCode environment.
