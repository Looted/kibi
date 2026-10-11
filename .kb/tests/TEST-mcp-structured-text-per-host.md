---
title: Discovery results reach each MCP host once and kb_search pages at ten rows by default
status: passing
tags:
  - mcp
  - search
  - search-lane
priority: must
text_ref: packages/mcp/tests/server/structured-text-host.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-mcp-structured-text-per-host
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-11T20:39:42.474Z'
id: TEST-mcp-structured-text-per-host
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-16e204eab6f9652185ae13c9
    test_id: TEST-mcp-structured-text-per-host
    scope: end_to_end
    outcome: passed
    code_snapshot: ebee35cf7bfcefc43baf562016134e8b96aaaf06d3b204787024c6d7eea12a3c
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-11T20:42:03.300Z'
    finished_at: '2026-10-11T20:42:08.846Z'
    artifact_digest: 72a70dfbc1449cd9686e56454babd1a704fbbea4f3e6f4f7801d9179d40f3f05
    contract_hash: 23943e860a92e95155c2ace8eab0839c8653278238c87dd1f97305f1f896015d
    binding_hash: 283d7edbd00a18f9483ea978507f2b10d80172de6d35dfe5a837aef16494b128
    fingerprint: 7815685d0c7ae7deff638869eee73d7812c395702d5233196fec94c76f07bc44
    fingerprint_components:
      contract: 23943e860a92e95155c2ace8eab0839c8653278238c87dd1f97305f1f896015d
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
      - symbol_id: SYM-test-mcp-structured-text-per-host
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Discovery results reach each MCP host once and kb_search pages at ten rows by default

`packages/mcp/tests/server/structured-text-host.test.ts` builds a sandbox repository with twelve requirements, runs `kibi init` and `kibi sync` on the built CLI, and starts the built `kibi-mcp` server over stdio once per case. With `KIBI_MCP_HOST=claude-code`, or with a client that names itself `claude-code` on initialize, the `kb_query` text part is the summary alone and the entities arrive only in `structuredContent`; with `KIBI_MCP_HOST=codex` the text starts with the `data` JSON ahead of the summary; `KIBI_MCP_STRUCTURED_TEXT=omit` and `embed` override both choices. `kb_search` without a `limit` returns ten of the twelve matching rows with `count: 12` and `truncated: true`. `packages/mcp/tests/server/tools-coverage.test.ts` covers the same decision in process, including the client-name fallback and the env override precedence.