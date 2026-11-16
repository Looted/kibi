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
    receipt_id: PR-58c51cb1470d96d59f0534f4
    test_id: TEST-agent-core-edit-snippet-why
    scope: end_to_end
    outcome: passed
    code_snapshot: 1c9b0c94e9514e1bd4b304f4a0a96dc0c62e02640994c50b0b2286f5f8a86582
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T16:47:34.299Z'
    finished_at: '2026-11-16T16:47:39.309Z'
    artifact_digest: f6c95951caee60a749fc4cfd889e4e0dd50050673028e0da18eeb2a8d1c4ae70
    contract_hash: 224d4d40039b12210402031044a34f08eb90d882323330d1358771cb1626e334
    binding_hash: e02c5b444a0fe837f019281bd9670b7bbcd1d3ecce5d5f965a988e4558a72add
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