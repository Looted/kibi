---
id: TEST-mcp-upsert-coverage
title: MCP upsert handler unit coverage exercises validation and failure paths
status: passing
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
    - symbol_id: SYM-e2e-mcp-crud
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4744760776a8b2f609f2a28d
    test_id: TEST-mcp-upsert-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:09:33.691Z'
    finished_at: '2026-11-05T12:12:51.062Z'
    artifact_digest: b39b74bff9760a7f282a5add8db18a92492ed15d5551c7473e7778ed0e83fcbf
    contract_hash: 055806307e945b298ebab39469f941cc0fcf7425ce4a136ffc5fe60bfbc34e19
    binding_hash: 413c309bb07edfec54672efb513fa882f586c0028b9d6c0c743e3ef0f7baf3f7
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
    kind: e2e
    evidence_level: tested
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
