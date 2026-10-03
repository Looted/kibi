---
title: Real kibi-mcp server lists 16 tools, routes composites and keeps dry-run upserts write-free
status: passing
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - mcp
  - tool-surface
  - composite-tools
  - parity
  - e2e
id: TEST-kibi-mcp-tool-consolidation
type: test
priority: must
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-mcp-tool-consolidation
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-mcp-tool-consolidation
    target: default
    native_id: packages/mcp/tests/server/tool-surface-consumer.test.ts::kibi-mcp consolidated tool surface::lists 16 tools, routes composites to the CLI operation payload, and dry-run upserts write nothing
    source_file: packages/mcp/tests/server/tool-surface-consumer.test.ts
    line: 147
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fa0e2dbe8514092575a003a3
    test_id: TEST-kibi-mcp-tool-consolidation
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ddaab71cf19bb014696ada5289d3d8865791d7fa3692887622550b869d9ef15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-03T10:03:37.984Z'
    finished_at: '2026-10-03T10:03:47.905Z'
    artifact_digest: 638d653ed2850f0d590eecbd658af20ca2d3e3682b8b5abfbe1ac523453ea5f4
    contract_hash: 767bde45e0093aa0265e597c1b00f37629ddc1940b6c13ec9f85e2b082b9aeca
    binding_hash: c948fc09b34d8b545d8d0d4d98b9314a930305e6d823ab6a929dc3bf0ca6bf21
    fingerprint: 8c52d166c356d68081970067c98960928e51098879660239f1a175dfb4c66d7a
    fingerprint_components:
      contract: 767bde45e0093aa0265e597c1b00f37629ddc1940b6c13ec9f85e2b082b9aeca
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: ee54e50df2af7ef3755af363c207e34203cdb5edf375c7c2d3aaca2edaeb2a9b
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-mcp-tool-consolidation
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Real kibi-mcp server lists 16 tools, routes composites and keeps dry-run upserts write-free

`packages/mcp/tests/server/tool-surface-consumer.test.ts` starts the shipped `kibi-mcp` binary over stdio in a fresh `kibi init` workspace and drives it with a standard MCP client: tools/list returns exactly the 16 agent-facing tools; `kb_skills` (action list) and `kb_model` (mode analyze) return the CLI `skills-list` and `semantic-advisor` payloads plus the selector; `kb_upsert` with `dryRun: true` reports both write effects skipped and writes nothing; `kb_job_status` and `kb_sparql_remote` register only when `KIBI_MCP_OPTIONAL_TOOLS` names them.

`packages/mcp/tests/server/tools-contract-fixture.test.ts` and `packages/cli/tests/parity/` keep the frozen tools/list contract and composite parity.
