---
id: TEST-opencode-python-comment-routing
title: OpenCode plugin verifies Python durable-comment routing
type: test
status: passing
created_at: 2026-03-21T13:00:00.000Z
updated_at: 2026-03-21T13:00:00.000Z
priority: should
tags:
  - opencode
  - python
  - test
  - comment-detection
links:
  - type: validates
    target: SCEN-opencode-python-comment-routing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-python-comment-routing
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-efbc4898b9fde02e60c55d53
    test_id: TEST-opencode-python-comment-routing
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: f21784288e6b020585f7342139b692762381133940133de8a0400287ba15cb33
    binding_hash: c47d478c7aba4a5d34666b09ec74dee6a9c711ae450d91834b61e21bf1b55ec7
    fingerprint: bdb3eb23e9149835c47b0283f71b9ef31fd1076f79f7166fbcf86320bd2f42bb
    fingerprint_components:
      contract: f21784288e6b020585f7342139b692762381133940133de8a0400287ba15cb33
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
      - symbol_id: SYM-e2e-test-opencode-python-comment-routing
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

### Unit Tests

**comment-analysis.test.ts:**
- Extract JS/TS long `//` comment block -> classify as FACT
- Extract JS/TS `/* */` rationale block -> classify as ADR
- Extract Python `#` comment block -> classify as ADR
- Extract Python module docstring with invariants -> classify as FACT
- Extract Python function docstring -> classify appropriately
- Short comments ignored (below minLines)
- Non-docstring triple-quoted strings ignored
- Fingerprint stability for dedupe

**path-kind.test.ts:**
- `.py` files classified as `code` kind

**prompt.test.ts:**
- Recent `fact` suggestion triggers FACT-specific routing guidance
- Recent `adr` suggestion triggers ADR-specific routing guidance
- No suggestion keeps generic code guidance

**index.test.ts:**
- `.py` file edit stores recent suggestion
- Repeated identical saves do not duplicate warnings
- Sync scheduling unchanged by comment analysis

### E2E Tests

**opencode-comment-guidance.test.ts:**
- Pack and install `kibi-opencode` tarball
- Create temp repo with `.opencode/kibi.json`
- Add Python file with long docstring containing durable knowledge
- Invoke `event` hook with `file.edited`
- Invoke `experimental.chat.system.transform`
- Assert prompt contains specific routing guidance (FACT/ADR/REQ)
- Repeated edit does not duplicate guidance

### Non-Regression

- `nonblocking.test.ts`: Comment analysis does not block sync
- `opencode-install.test.ts`: Packed install still works
- `opencode-plugin.test.ts`: Loader safety maintained
