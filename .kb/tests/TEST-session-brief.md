---
title: The shared session brief is what every host adapter, the MCP server and kb_status open with
status: passing
priority: must
tags:
  - session-brief
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-session-brief
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
id: TEST-session-brief
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-13f3ad3b55594d23df2ec6f1
    test_id: TEST-session-brief
    scope: end_to_end
    outcome: passed
    code_snapshot: e2c40d42d8dd76f889eb95ae616cbeb2c38c0bf586612fa659b8ea469ecc482c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T23:06:59.826Z'
    finished_at: '2026-11-16T23:07:04.868Z'
    artifact_digest: 1167082b4b65e1650e048ff5013530f46665211891abe460c675239ff2305a08
    contract_hash: 0985abde36a4ebb411e5c2cee7e525163ab7063bc98cf3aea9d2cb34dde4b6ff
    binding_hash: 7b799db5f2ed96b5d691d3d1bdd058b377539480c7b9c14ddc0de4ede627eb76
    fingerprint: 5bf07a0398005f5a2222dad5847319d4d40c14f32fb87ad67a2392b2d4d36e69
    fingerprint_components:
      contract: 0985abde36a4ebb411e5c2cee7e525163ab7063bc98cf3aea9d2cb34dde4b6ff
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
      - symbol_id: SYM-test-session-brief
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Asserts the brief's lines (search, record, check, conflict rule), its size and how host lines follow it (packages/agent-core/tests/session-brief.test.ts), then that each surface carries it: the Claude Code session-start context, the Codex and Cursor SessionStart hook output, the ZCode session context, the OpenCode system prompt for an active workspace and none without a knowledge base, the MCP initialize instructions, and the kb_status result. A false pass would need a host that builds the brief's text by hand rather than importing it, which the exact-string assertions still catch.