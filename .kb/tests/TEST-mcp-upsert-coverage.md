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
    receipt_id: PR-074f227020e8b6455ad0722c
    test_id: TEST-mcp-upsert-coverage
    scope: end_to_end
    outcome: passed
    code_snapshot: 989febbc0c4f9f4553aa471095c0a7f0e2c97f403192fe51475fe55928c75177
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:37:19.948Z'
    finished_at: '2026-11-10T05:38:40.142Z'
    artifact_digest: 8693a2b6aa798bb9eb4f361c6ede8594955ca1b5cff8ef3a97072d951b14d55f
    contract_hash: e5bb755b312aadb198ba642509064309002dfe03cf8aedda03daf1ddfb028ca2
    binding_hash: e6f192de31a26a1d887ab1e7fbf0fc481073f4e79ac84c4f548b077e0ce40f4e
    fingerprint: 59e065822b1f1b2ae98996da6c3389dcaae5ffbce44245ab56ebe45f0e71c6d9
    fingerprint_components:
      contract: e5bb755b312aadb198ba642509064309002dfe03cf8aedda03daf1ddfb028ca2
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
      - symbol_id: SYM-e2e-mcp-crud
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
