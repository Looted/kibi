---
title: Verify VS Code MCP server definition provider registration and manifest contract
status: passing
verification_scope: end_to_end
verification_perspective: internal
tags:
  - vscode
  - mcp
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-vscode-mcp-provider
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T14:53:21.075Z'
id: TEST-vs-code-extension-register-kibi-mcp
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1ea4fcd9d00e003e02b07ae8
    test_id: TEST-vs-code-extension-register-kibi-mcp
    scope: end_to_end
    outcome: passed
    code_snapshot: 8185eabdda7c6eb651d7c5496982cca18fee469f8aa4cbbbd2acdb374491155f
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-25T14:59:26.168Z'
    finished_at: '2026-11-25T14:59:26.319Z'
    artifact_digest: ba8d98b42d0e9c068b73b8aa94c59478fbf140fd0d533a69b716d0508966ab8b
    contract_hash: c6d0f66a1a24ef4404cab433fedffdf0eb458c8e340f9c94c1ec2e8064820665
    binding_hash: 012dec8d8c0a0e9ed8500fa901896a91f45a22fca81c4028ba6f2219d69e6edf
    fingerprint: 29f56434fc1e64bc42ccc66d76909a7030415a4492e5391edf991cc5c1109a64
    fingerprint_components:
      contract: c6d0f66a1a24ef4404cab433fedffdf0eb458c8e340f9c94c1ec2e8064820665
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
      - symbol_id: SYM-test-vscode-mcp-provider
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Exercises packages/vscode/tests/activation/mcp.test.ts, packages/vscode/tests/manifestContract.test.ts, and packages/vscode/tests/activation/extension.test.ts to verify contributes.mcpServerDefinitionProviders, activation wiring, workspace opt-in gating on .kb/manifest.json, server command resolution precedence, configuration change notifications, and graceful degradation when vscode.lm is unavailable.
