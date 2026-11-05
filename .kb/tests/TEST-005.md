---
id: TEST-005
title: MCP server responds to the curated public tools with valid JSON-RPC format
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-08-02T00:00:00.000Z
priority: must
tags:
  - mcp
  - server
  - unit
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-005
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-073a9277d85c4dc18db18c10
    test_id: TEST-005
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: 3b755a1568518b84db09ba49a7bc043751efed57b0b5add647ddcbf0bcfc5f20
    binding_hash: 2bf9a8ff1db7657eff2bc183e80b0225929a4b427f0d41c2ed079c8f31712ef6
    fingerprint: bb2dbb871f65c91f4ec367a69ce4bfca8564d072e38934b82c85a46dc08c48ec
    fingerprint_components:
      contract: 3b755a1568518b84db09ba49a7bc043751efed57b0b5add647ddcbf0bcfc5f20
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
      - symbol_id: SYM-e2e-test-005
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Starts `kibi-mcp` in a test environment. Sends `tools/list` and asserts:
- Response has `result.tools` array with the curated public tool set
- Each tool has `name`, `description`, `inputSchema`
- Tool names are exactly `kb_query`, `kb_search`, `kb_status`, `kb_find_gaps`, `kb_coverage`, `kb_graph`, `kb_upsert`, `kb_delete`, `kb_check`
- Non-interactive read tools, including `kb_status`, publish `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, and `openWorldHint: false`; frozen base and diagnostic tool-list contracts preserve those annotations.
