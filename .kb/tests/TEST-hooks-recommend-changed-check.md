---
title: Host hooks recommend the changed check tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - check
  - staged
origin:
  kind: agent
  recorded_at: '2026-11-16T19:30:00.000Z'
id: TEST-hooks-recommend-changed-check
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-hooks-recommend-changed-check
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-439254c99d1cc5afcfbb8580
    test_id: TEST-hooks-recommend-changed-check
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 4d2b62b53ab5edf9077ef69b60476270992f2ed8b43070922e791eb0c1359261
    binding_hash: 80673d183088475ba9243e32000770184185f06a9e89236d360de4af17c549f0
    fingerprint: 2448b593d6ed89e3fda51e79ed2c00a6b035e17ac3baf67865e8ceb6abadf129
    fingerprint_components:
      contract: 4d2b62b53ab5edf9077ef69b60476270992f2ed8b43070922e791eb0c1359261
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
      - symbol_id: SYM-test-hooks-recommend-changed-check
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the post-edit and Stop messages of agent-core, Claude Code, Codex, Cursor, OpenCode and ZCode name kb_check with changed:true and the edited files, say it gives the commit gate's verdict, and that a changed check counts as the impact check the reminders ask for.