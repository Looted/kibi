---
title: Edit snippet Why line tests across hosts
status: passing
priority: must
tags:
  - hooks
  - snippets
  - agent-core
  - claude
  - codex
  - cursor
  - zcode
  - opencode
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-agent-core-edit-snippet-why
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T15:41:26.795Z'
id: TEST-agent-core-edit-snippet-why
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-333d81a28b6478cbf61a5b33
    test_id: TEST-agent-core-edit-snippet-why
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 224d4d40039b12210402031044a34f08eb90d882323330d1358771cb1626e334
    binding_hash: d8a5f9591f1352089e0a522a238fa723e57f380a26c6561289eb0108f073efb3
    fingerprint: d9fdd3283b887b9dce54efaabb3bafbc82feadf0fe153c4c12a9130d7abbd06f
    fingerprint_components:
      contract: 224d4d40039b12210402031044a34f08eb90d882323330d1358771cb1626e334
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
      - symbol_id: SYM-test-agent-core-edit-snippet-why
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs packages/agent-core/tests/snippets.test.ts (the Why line's labels, who and when, the sentence cut, its place after what must stay true, edit snippets and edit updates give it and reads do not, and a snippet over budget lists fewer requirements before the Why line or the next calls are cut) and packages/agent-core/tests/knowledge-index-contract.test.ts (where a summary reads the reason from, in order, and who and when from each origin kind). The host hook tests run each host's hook command end to end and check that it shows the line: packages/claude/tests/hook-runner.test.ts, packages/codex/tests/hook-runner.test.ts, packages/cursor/tests/hook-runner.test.ts, packages/zcode/tests/hook-runner.test.ts and packages/opencode/tests/edit-knowledge.test.ts.

A false pass would be a fixture whose requirement records no reason, so only the 'no reason is recorded' line is ever shown.