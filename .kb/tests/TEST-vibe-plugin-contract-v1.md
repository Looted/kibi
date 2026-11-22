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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e6ea2276aad7035119a9f9e6
    test_id: TEST-vibe-plugin-contract-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7c8dcf94547f5c0fceaf8a683f95d7bfe09aaf53a3820b62c1edc80dac23f57c
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-22T18:30:22.879Z'
    finished_at: '2026-11-22T18:30:29.406Z'
    artifact_digest: 6a2df3b128fc5968e18532508a405ffeb6d562a6ebec4f76f066460e45a345cf
    contract_hash: d66ebf1e83c402ba89ac3a88ac6045a2a8c452821ba7cf85b865cda31151dcdd
    binding_hash: 815f2e09895b5b4efb2190af965b32c061c1a6888bf0f3f34ddc691490af653b
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
    kind: e2e
    evidence_level: tested
---
Runs via proof/steps/TEST-vibe-plugin-contract-v1.json: node --test packages/vibe/tests/runtime.test.mjs packages/vibe/tests/launcher-contract.test.mjs. Covers the 16 kb_* tools handshake in a Kibi workspace, the silent zero-tool server outside Kibi workspaces, the WSL-safe spawn argv (no shell string, -d distro, hard fail on unconvertible paths), workspace resolution order, and fail-open hooks.