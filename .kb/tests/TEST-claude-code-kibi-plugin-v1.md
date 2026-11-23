---
title: Verify Claude Code Kibi plugin hooks, distribution, and opt-in behavior
status: passing
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - claude-code
  - plugin
  - hooks
id: TEST-claude-code-kibi-plugin-v1
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-claude-case-unconfigured-workspace-silent
      target: default
    - symbol_id: SYM-claude-case-read-snippet-once
      target: default
    - symbol_id: SYM-claude-case-edit-focus
      target: default
    - symbol_id: SYM-claude-case-stop-reminder-once
      target: default
    - symbol_id: SYM-claude-case-prefixed-check-acknowledges
      target: default
    - symbol_id: SYM-claude-case-advisory-boundary
      target: default
    - symbol_id: SYM-claude-case-scanner-equivalence
      target: default
    - symbol_id: SYM-claude-case-shipped-bundle-runs
      target: default
    - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
      target: default
    - symbol_id: SYM-claude-case-optional-package-contract
      target: default
    - symbol_id: SYM-claude-case-usage-telemetry
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-claude-case-unconfigured-workspace-silent
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::workspace opt-in::every event is silent and stateless outside a Kibi workspace
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 71
  - symbol_id: SYM-claude-case-read-snippet-once
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::pre-read snippets::a linked file shows requirement titles, symbols, tests, and next calls once
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 121
  - symbol_id: SYM-claude-case-edit-focus
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::pre-edit snippets::a first edit names the edited symbol and the impact check
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 193
  - symbol_id: SYM-claude-case-stop-reminder-once
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::stop reminders::unchecked source edits are reminded once, then the agent may stop
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 287
  - symbol_id: SYM-claude-case-prefixed-check-acknowledges
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::stop reminders::a host-prefixed kb_check naming the file acknowledges it
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 308
  - symbol_id: SYM-claude-case-advisory-boundary
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::advisory boundary::hooks never deny, rewrite input, or touch the workspace
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 390
  - symbol_id: SYM-claude-case-scanner-equivalence
    target: default
    native_id: packages/claude/tests/knowledge-index.test.ts::symbol manifest scanner::matches a full YAML parse on the canonical writer layout
    source_file: packages/claude/tests/knowledge-index.test.ts
    line: 44
  - symbol_id: SYM-claude-case-shipped-bundle-runs
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude distribution artifacts::the bundle runs under node and emits Claude Code hook JSON
    source_file: packages/claude/tests/distribution.test.ts
    line: 59
  - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude MCP launcher::serves no tools when the project dir does not own .kb/manifest.json
    source_file: packages/claude/tests/distribution.test.ts
    line: 282
  - symbol_id: SYM-claude-case-optional-package-contract
    target: default
    native_id: packages/claude/tests/distribution.test.ts::kibi-claude package contract::optional package contract has no install lifecycle or runtime dependencies
    source_file: packages/claude/tests/distribution.test.ts
    line: 222
  - symbol_id: SYM-claude-case-usage-telemetry
    target: default
    native_id: packages/claude/tests/hook-runner.test.ts::usage telemetry::records whether the agent consulted Kibi before reading and editing
    source_file: packages/claude/tests/hook-runner.test.ts
    line: 472
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c30b427fd58109a2d84b5ebf
    test_id: TEST-claude-code-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 75ca354cb2640db989f3719d6a1a24a9adb15151e270adbc1c6477876e56a614
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T17:57:50.893Z'
    finished_at: '2026-11-22T17:57:54.664Z'
    artifact_digest: 1b8ebb2d81cdb2db21d13d098ad997741db4958ba0a132eb3c299f458975aae3
    contract_hash: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
    binding_hash: b29dd78763fa004deea4e7608bc5344018b8d7fc710a39492a2a387bbdb97ce5
    fingerprint: ed0726a57196b5a8adbc0e4f435e2abc69c56759ce0846e90905f6f9679cab6d
    fingerprint_components:
      contract: 252c4871c7b4f76dc0f90349ab4541e69844fe3ff8881fd17a1a9f502599a2a6
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ba6dc1da8fcf102e684965991676f5f03673de3b43157c2aea9a98dae3d99528
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-claude-case-unconfigured-workspace-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-read-snippet-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-edit-focus
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-stop-reminder-once
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-prefixed-check-acknowledges
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-advisory-boundary
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-scanner-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-shipped-bundle-runs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-mcp-silent-outside-kibi
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-optional-package-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-claude-case-usage-telemetry
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
# Verify the Claude Code Kibi plugin hooks, distribution, and opt-in behavior

Run with `bun test ./packages/claude`.

- `tests/hook-runner.test.ts`: snippet content, per-session dedupe, read-window and edit focus, suppression after Kibi exploration, the unowned-file note, the one-shot `.kb/` and search notes, Stop reminders and their acknowledgment by host-prefixed MCP and CLI checks, session isolation, silence outside Kibi workspaces, and the advisory boundary (no deny, no input rewrite, no workspace writes).
- `tests/knowledge-index.test.ts`: the manifest line scanner matches a full YAML parse on writer and hand-authored layouts; cache reuse and invalidation; entity summary lookup cannot escape its lane.
- `tests/distribution.test.ts`: the committed hook bundle matches the source and runs under Node; concurrent hook processes keep every journal event; manifests reference shipped files; skill names equal skill ids; the package has no install lifecycle; the MCP launcher exposes no tools outside Kibi workspaces.
