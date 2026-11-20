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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-679e65659a7bc8f9e70b8009
    test_id: TEST-kibi-mcp-tool-consolidation
    scope: end_to_end
    outcome: passed
    code_snapshot: 3cbdf32b0ca578c0e6fb1cb36066284a666736978a016aff5518fbb451bb6544
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T04:36:42.460Z'
    finished_at: '2026-11-20T04:36:52.605Z'
    artifact_digest: 22be85032159aedeb892702eea25c0f70aab305878a4fada1839c790d20e7894
    contract_hash: 767bde45e0093aa0265e597c1b00f37629ddc1940b6c13ec9f85e2b082b9aeca
    binding_hash: 45ea94debfc978ec9e43d5c34d9717cc19ad7527bb48304e117037119c745528
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Real kibi-mcp server lists 16 tools, routes composites and keeps dry-run upserts write-free

`packages/mcp/tests/server/tool-surface-consumer.test.ts` starts the shipped `kibi-mcp` binary over stdio in a fresh `kibi init` workspace and drives it with a standard MCP client: tools/list returns exactly the 16 agent-facing tools; `kb_skills` (action list) and `kb_model` (mode analyze) return the CLI `skills-list` and `semantic-advisor` payloads plus the selector; `kb_upsert` with `dryRun: true` reports both write effects skipped and writes nothing; `kb_job_status` and `kb_sparql_remote` register only when `KIBI_MCP_OPTIONAL_TOOLS` names them.

`packages/mcp/tests/server/tools-contract-fixture.test.ts` and `packages/cli/tests/parity/` keep the frozen tools/list contract and composite parity.
