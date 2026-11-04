---
title: Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own
status: passing
tags:
  - hooks
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
verification_scope: unit
verification_perspective: internal
text_ref: packages/agent-core/tests/shared-hook-inputs.test.ts
origin:
  kind: agent
  recorded_at: '2026-11-04T14:37:06.710Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-agent-core-shared-hook-inputs
      target: default
  success_policy: all_required_first_attempt
id: TEST-agent-core-shared-hook-inputs
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3f2e4d93c5c5b5a69df03108
    test_id: TEST-agent-core-shared-hook-inputs
    scope: unit
    outcome: passed
    code_snapshot: 012ccdf9f502cdd0a6b3bdbf322b88f696ef30fc7ae0375e8cc665c5914062c7
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T14:42:03.956Z'
    finished_at: '2026-11-04T14:42:04.038Z'
    artifact_digest: ec44fbfda49fa753b79ac5776b2c8bf351e7d9cc3cce03b80055cea04c0614de
    contract_hash: 43bf924e57bd6ec34ae7f092d9155d79eba8e8ad4b0eb1393c09c46475743292
    binding_hash: 4aecee4873772e349dd4e3bfac2268863a4c7cc62d081ce06cbef54e130b524f
    fingerprint: 72e3996a247df907a49880340e24824abc57a5afa71aa690827f6de85ec81312
    fingerprint_components:
      contract: 43bf924e57bd6ec34ae7f092d9155d79eba8e8ad4b0eb1393c09c46475743292
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
      - symbol_id: SYM-unit-test-agent-core-shared-hook-inputs
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
# Every host hook imports the shared path, Kibi MCP call and knowledge index decisions and declares none of its own

Runs `packages/agent-core/tests/shared-hook-inputs.test.ts`. For each of the Claude Code, Codex, Cursor and ZCode packages it reads the host's TypeScript sources and checks that they import `classifyPath`, `loadKnowledgeIndex` and the MCP tool name rule from kibi-agent-core, and that any local function with the same name only returns a call to the shared one. A fixture that redefines `classifyPath` shows the check catches a host that forks the decision.
