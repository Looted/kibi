---
title: kibi init writes a GEMINI.md import of AGENTS.md
status: passing
priority: must
tags:
  - init
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-instructions-mutation
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
id: TEST-init-gemini-instructions
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c7be4dc2f465ab30a43b999e
    test_id: TEST-init-gemini-instructions
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 3f62c8c3a02a922e0ad2fc91cb4fefafa05bceb9e44f0e3cc5d76eaa0b1d0811
    binding_hash: ddd7e81115e1578da472d5fc8a9da8a8d938ef99f66d6a71cf727b5aa7617d08
    fingerprint: 78fbfab3a2476c87ac1c4a61a3711acc986e010ba44c51ce88eb14384c6b907c
    fingerprint_components:
      contract: 3f62c8c3a02a922e0ad2fc91cb4fefafa05bceb9e44f0e3cc5d76eaa0b1d0811
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
      - symbol_id: SYM-test-agent-instructions-mutation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs writeAgentInstructions in temporary worktrees (packages/cli/tests/commands/agent-instructions-mutation.test.ts and fresh-clone-setup.test.ts) and asserts that GEMINI.md is created with the @./AGENTS.md section, that the user's own GEMINI.md text is kept, that an existing import or a link to AGENTS.md is left alone, that a link out of the worktree is never followed, and the line kibi init prints for each outcome.