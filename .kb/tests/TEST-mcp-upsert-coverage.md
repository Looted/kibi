---
id: TEST-mcp-upsert-coverage
title: MCP upsert handler unit coverage exercises validation and failure paths
status: active
created_at: 2026-03-30T00:00:00.000Z
updated_at: 2026-03-30T00:00:00.000Z
priority: must
tags:
  - mcp
  - test
  - upsert
  - coverage
source: packages/mcp/tests/tools/upsert.test.ts
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-upsert-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-ffcbe1ff729aab802520ce20
    test_id: TEST-mcp-upsert-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 055806307e945b298ebab39469f941cc0fcf7425ce4a136ffc5fe60bfbc34e19
    binding_hash: deac0a5962d7d4bceaa2e45029eae418f5582b1d9c9dcb97178a99f10f43715a
    fingerprint: 1d13e50c7e4dd185aecbbc35beff8ed1abef6876b32ddeb020b692022dda832c
    fingerprint_components:
      contract: 055806307e945b298ebab39469f941cc0fcf7425ce4a136ffc5fe60bfbc34e19
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
      - symbol_id: SYM-e2e-test-mcp-upsert-coverage
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Validation steps:
- run `bun test packages/mcp/tests/tools/upsert.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts packages/mcp/tests/tools/crud.test.ts`
- run `bun test --coverage packages/mcp/tests/tools/upsert.test.ts packages/mcp/tests/tools/upsert-contradictions.test.ts packages/mcp/tests/tools/crud.test.ts`
- verify `packages/mcp/src/tools/upsert.ts` reports 100% line coverage
- verify mocked paths cover validation, contradiction formatting, audit/save failures, and symbol refresh warnings
