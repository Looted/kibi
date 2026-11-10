---
id: TEST-005
title: MCP server responds to the curated public tools with valid JSON-RPC format
status: passing
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
    receipt_id: PR-01e20da126168088071bb0a4
    test_id: TEST-005
    scope: end_to_end
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:33:42.441Z'
    finished_at: '2026-11-10T05:36:08.645Z'
    artifact_digest: dc8736db249dfdd88751ad8485abe81283e5b9591ca84f894b18a7ce3504ead7
    contract_hash: 3b755a1568518b84db09ba49a7bc043751efed57b0b5add647ddcbf0bcfc5f20
    binding_hash: 0959cb217b4ec6c76c359222dffabe374b234976c26ec5cb00e1b280fe9ea57c
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
