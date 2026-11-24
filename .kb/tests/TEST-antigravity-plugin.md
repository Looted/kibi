---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:02:28.454Z'
priority: must
status: passing
tags:
  - antigravity
  - plugin
  - hooks
  - mcp
title: Verify Antigravity Kibi plugin contract, MCP launcher, and lifecycle hooks
verification_perspective: consumer
verification_scope: end_to_end
id: TEST-antigravity-plugin
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-antigravity-mcp-launcher
      target: default
    - symbol_id: SYM-hook-input-antigravity-hook-input
      target: default
    - symbol_id: SYM-hook-input-parse-hook-input
      target: default
    - symbol_id: SYM-hook-runner-run-hook
      target: default
    - symbol_id: SYM-index-adapter-kind
      target: default
    - symbol_id: SYM-index-package-name
      target: default
    - symbol_id: SYM-kb-tools-canonical-kb-operation
      target: default
    - symbol_id: SYM-kb-tools-extract-cli-kb-usage
      target: default
    - symbol_id: SYM-kb-tools-extract-mcp-kb-usage
      target: default
    - symbol_id: SYM-kb-tools-is-verified-git-commit
      target: default
    - symbol_id: SYM-kb-tools-kb-usage
      target: default
    - symbol_id: SYM-kb-tools-unwrap-kibi-mcp-call
      target: default
    - symbol_id: SYM-kb-tools-workspace-overwrite
      target: default
    - symbol_id: SYM-session-state-append-session-events
      target: default
    - symbol_id: SYM-session-state-load-session-state
      target: default
    - symbol_id: SYM-session-state-session-dir
      target: default
    - symbol_id: SYM-session-state-session-journal
      target: default
    - symbol_id: SYM-session-state-workspace-data-dir
      target: default
    - symbol_id: SYM-snippets-direct-kb-access-note
      target: default
    - symbol_id: SYM-snippets-search-tip
      target: default
    - symbol_id: SYM-snippets-session-start-context
      target: default
    - symbol_id: SYM-snippets-stop-reminder
      target: default
    - symbol_id: SYM-src-session-state-session-event
      target: default
    - symbol_id: SYM-src-session-state-session-state
      target: default
    - symbol_id: SYM-usage-log-append-hook-usage
      target: default
    - symbol_id: SYM-usage-log-flush-hook-telemetry
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8a7a0c616588c2e0be7e1389
    test_id: TEST-antigravity-plugin
    scope: end_to_end
    outcome: passed
    code_snapshot: a4d217e19fc25c8c8f5dfe52759e42162f9499a99b8371c5769e3d7fb7e220c9
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-24T04:44:53.552Z'
    finished_at: '2026-11-24T04:44:54.578Z'
    artifact_digest: 3f5519b70643b61e5e756ad0c78b9b3ed5942b841585a81d85c6574ed009e114
    contract_hash: 9ab942663746a2b27e68e209e66998ee44ec49402638bb5d4e8c9e1d63310555
    binding_hash: bf6be7153ba2e980ec2a565232d1d11ef96ada6f51630a194fb07c24d0121625
    fingerprint: 0144d8169b0f9052874b182a29e24aefa8d414469314d46155d1e6f7d2b7931c
    fingerprint_components:
      contract: 9ab942663746a2b27e68e209e66998ee44ec49402638bb5d4e8c9e1d63310555
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
      - symbol_id: SYM-antigravity-mcp-launcher
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-hook-input-antigravity-hook-input
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-hook-input-parse-hook-input
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-hook-runner-run-hook
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-index-adapter-kind
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-index-package-name
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-canonical-kb-operation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-extract-cli-kb-usage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-extract-mcp-kb-usage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-is-verified-git-commit
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-kb-usage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-unwrap-kibi-mcp-call
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-kb-tools-workspace-overwrite
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-session-state-append-session-events
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-session-state-load-session-state
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-session-state-session-dir
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-session-state-session-journal
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-session-state-workspace-data-dir
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-snippets-direct-kb-access-note
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-snippets-search-tip
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-snippets-session-start-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-snippets-stop-reminder
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-src-session-state-session-event
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-src-session-state-session-state
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-usage-log-append-hook-usage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-usage-log-flush-hook-telemetry
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Verify the Antigravity Kibi plugin contract, MCP workspace discovery, and lifecycle hooks

Run with `bun test ./packages/antigravity/tests`.

- `tests/plugin-contract.test.ts`: root `plugin.json` schema and allowed keys, root `hooks.json` event structure and regex matchers, `mcp_config.json`, `rules/AGENTS.md`, executable `bin/` launchers, and zero-drift skill mirror parity.
- `tests/mcp-launcher.test.ts`: workspace opt-in resolution up to `.git`, silent zero-tool fallback outside Kibi workspaces, missing `kibi-mcp` guidance, stdio proxying when local `kibi-mcp` is available, and global Marketplace install discovery via MCP `roots/list`.
- `tests/hook-runner.test.ts`: protojson hook parsing, `call_mcp_tool` unwrapping and `workspaceRoot` stamping, CLI/MCP usage extraction, session start brief, queued PreInvocation snippets, firm-edit confirmation (`force_ask`), stop reminders, opt-in diagnostic usage telemetry, and non-Kibi `PreToolUse` `"ask"` scoping for mutating tools.
