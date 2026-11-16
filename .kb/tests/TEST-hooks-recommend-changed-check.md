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
    receipt_id: PR-8eb3fac5068547715fb86b06
    test_id: TEST-hooks-recommend-changed-check
    scope: end_to_end
    outcome: passed
    code_snapshot: 818ac6f00909c873285da37afb4e8e96d670153d724b0dd86bb44a8c2759a9bc
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T20:36:24.865Z'
    finished_at: '2026-11-16T20:36:25.445Z'
    artifact_digest: 743758845b5e923006c5b3a13d2306cccea8118bbe74983ddbf8f821cf0f230e
    contract_hash: 4d2b62b53ab5edf9077ef69b60476270992f2ed8b43070922e791eb0c1359261
    binding_hash: b2fe4559d62a30cfd9f021be96efe61c90b3a07214c30edc40094c7151a22a92
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