---
title: 'Vibe plugin launcher contract: MCP handshake, WSL-safe spawn plan, workspace resolution, fail-open hooks'
status: active
priority: must
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-vibe-kibi-runtime
      target: default
    - symbol_id: SYM-vibe-launch-kibi-mcp
      target: default
    - symbol_id: SYM-vibe-kibi-cli-wrapper
      target: default
    - symbol_id: SYM-vibe-hooks-common
      target: default
    - symbol_id: SYM-vibe-hook-file-context
      target: default
    - symbol_id: SYM-vibe-hook-prompt-context
      target: default
    - symbol_id: SYM-vibe-hook-session-context
      target: default
    - symbol_id: SYM-vibe-runtime-test
      target: default
    - symbol_id: SYM-vibe-launcher-contract-test
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-19T20:15:58.094Z'
id: TEST-vibe-plugin-contract-v1
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-078e21008b0115ce618ed91e
    test_id: TEST-vibe-plugin-contract-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 01aa2fdd8a99ec8e20126decee505688e4b8c18cc08aac901041e35050f5d3fe
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-19T20:51:40.084Z'
    finished_at: '2026-11-19T20:51:51.046Z'
    artifact_digest: d0a32d6e49bb3aa0822ad538100686b2b300e43f04527c1c932705375587cd51
    contract_hash: d66ebf1e83c402ba89ac3a88ac6045a2a8c452821ba7cf85b865cda31151dcdd
    binding_hash: 661ac35362402a6c9c655a6e5a65ce61f6e6b6418e83e6fd8d0daf0031704ab2
    fingerprint: e9ad321199c3400c2220dcacebb4377c0e1158b0503e00222aefaddbb9c35a76
    fingerprint_components:
      contract: d66ebf1e83c402ba89ac3a88ac6045a2a8c452821ba7cf85b865cda31151dcdd
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
      - symbol_id: SYM-vibe-kibi-runtime
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-launch-kibi-mcp
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-kibi-cli-wrapper
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-hooks-common
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-hook-file-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-hook-prompt-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-hook-session-context
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-runtime-test
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
      - symbol_id: SYM-vibe-launcher-contract-test
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs via proof/steps/TEST-vibe-plugin-contract-v1.json: node --test packages/vibe/tests/runtime.test.mjs packages/vibe/tests/launcher-contract.test.mjs. Covers the 16 kb_* tools handshake in a Kibi workspace, the silent zero-tool server outside Kibi workspaces, the WSL-safe spawn argv (no shell string, -d distro, hard fail on unconvertible paths), workspace resolution order, and fail-open hooks.