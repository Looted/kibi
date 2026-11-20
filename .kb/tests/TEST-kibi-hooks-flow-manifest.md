---
title: Flow-layout symbol manifests are read by the hook bundle and normalised by kibi sync
status: passing
tags:
  - hooks
  - agent-core
  - claude
  - sync
  - search-lane
priority: must
text_ref: packages/cli/tests/consumer/flow-manifest-hooks.test.ts; packages/agent-core/tests/agent-core.test.ts; packages/claude/tests/hook-runner.test.ts; packages/cli/tests/commands/sync.in-process.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-hooks-flow-manifest
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-11T16:19:08.630Z'
id: TEST-kibi-hooks-flow-manifest
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c6646d5103eb47a191b51141
    test_id: TEST-kibi-hooks-flow-manifest
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 85094e4e0ce61e6255ddadc789ea8600f47914c88261a567f9efcad6d8ec61ed
    binding_hash: fc74cd04ea05828cf2c2d56eef04c05e31543b57297b5226f562804328c817b1
    fingerprint: 6c9c09d97848fa1b7c0123cf767c46b952524174ee7f52236b9566a791ea56c4
    fingerprint_components:
      contract: 85094e4e0ce61e6255ddadc789ea8600f47914c88261a567f9efcad6d8ec61ed
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
      - symbol_id: SYM-test-kibi-hooks-flow-manifest
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Flow-layout symbol manifests are read by the hook bundle and normalised by kibi sync

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/flow-manifest-hooks.test.ts` commits the one-line flow manifest kibi-cli before 2.18.0 produced, runs the shipped Claude Code hook bundle (`packages/claude/bin/hook-runner.mjs`) before an edit of a file it links and expects the requirement named rather than an unowned note, then runs a plain `kibi sync` on the built CLI and expects the manifest rewritten once in block layout with its comment and order kept and both symbols still queryable by source file. Unit coverage: `a manifest written as one flow sequence indexes like its block form` and `the index says whether the manifest was missing, empty, read or unreadable` in `packages/agent-core/tests/agent-core.test.ts` (one-line, CRLF-wrapped and block-with-flow-values manifests scan identically to a full YAML parse, manifest state, coordinate files); `a manifest written as one flow sequence still yields edit snippets`, `an unreadable manifest is reported once instead of calling files unowned` and `a file the coordinate artifact binds a symbol to is not called unowned` in `packages/claude/tests/hook-runner.test.ts`; and `a flow-style symbol manifest is rewritten in block layout` in `packages/cli/tests/commands/sync.in-process.test.ts` (idempotent second sync).
