---
title: OpenCode decision hooks and plugin wiring
status: passing
priority: must
verification_scope: end_to_end
tags:
  - opencode
  - hooks
origin:
  kind: agent
  recorded_at: '2026-11-17T17:01:50.759Z'
id: TEST-opencode-decision-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-opencode-decision-hooks
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4a7b523e8b8e988bbb3586a1
    test_id: TEST-opencode-decision-hooks
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: d40094ec12c5f87230ccf15a911b8d09981dfe6481950a4bb4e7b5c333d6172f
    binding_hash: 7c03971a80ac4c6d859b3b43199875ded4681e8da63484d795628e87b4accc40
    fingerprint: 7d577cf2c82e21577b259a44926c659ffac83786a6a8cfa47a9bde068963ea66
    fingerprint_components:
      contract: d40094ec12c5f87230ccf15a911b8d09981dfe6481950a4bb4e7b5c333d6172f
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
      - symbol_id: SYM-test-opencode-decision-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Drives the OpenCode decision hooks and the plugin hooks chat.message, tool.execute.before, tool.execute.after and session.idle in a temporary Kibi workspace with a firm requirement: the rule note and capture template after the first source edit, the firm-edit stop once per requirement per session, the idle capture and signoff requests, rules recorded through the CLI or any server key, and no hooks in a workspace without Kibi (packages/opencode/tests/decision-hooks.test.ts).
