---
id: TEST-kibi-operation-interface-parity
title: Kibi public operation parity verification plan
type: test
status: passing
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-07-22T00:00:00.000Z
source: documentation/tests/TEST-kibi-operation-interface-parity.md
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-63b15d823d70219528a3c461
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: failed
    code_snapshot: 71b43ef38f0945d5febd8dad9a12223a2f13e5092564f8222974a6fb48fc1ea5
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T06:30:49.943Z'
    finished_at: '2026-09-06T07:22:27.216Z'
    artifact_digest: 874dd5c6d454cff93bdf784b60380ee2fa22f4058f4382076d931c84dde61ccd
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-kibi-operation-interface-parity
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-packed-dependency-ordered-repair-plan (failed), SYM-e2e-packed-cli-github-report (failed), SYM-test-core-journaled-engine-delta-sync (failed), SYM-test-opencode-bootstrap-paths (failed), SYM-codex-packed-plugin-e2e (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-852a0b5b331f3ed47365fc18
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 9648b885459e3a707873828ffc71810a3f3087e64d820acb1e5c20c4d424ee78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T08:03:27.689Z'
    finished_at: '2026-09-06T08:53:08.385Z'
    artifact_digest: a9446e6bf639a8313722c309e3e6a6bf674e647b465bc9a1f94f58e2956e82a6
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fea90822740af95b0406c3f3
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 7a4310b9bccfd5ad2dc5dee7081fe78f9a64ccd5e179422b91542bb71e857382
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T09:14:02.169Z'
    finished_at: '2026-09-06T09:59:05.533Z'
    artifact_digest: 9700ae4ded2511c37e52dea96afb2ea71ea74ee07cd3bfef21fcf341d6714563
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c4dec8b611a73b72aff546ac
    test_id: TEST-kibi-operation-interface-parity
    scope: end_to_end
    outcome: passed
    code_snapshot: 877cc6202786943ab48c6e5914d1be7d4635e7e4450368b7cbb1cfbd537aeded
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T10:13:05.534Z'
    finished_at: '2026-09-06T11:02:05.222Z'
    artifact_digest: 3da3eeee7d1f0f1eba5c4f27b12c053492661a41debcb4cc9944e6b22926a852
    contract_hash: bff0265c5e889c137654a7135eab9874e3e32ff9d773556fb00d8ea28f09a706
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
