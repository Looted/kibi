---
id: TEST-mcp-tag-filtering-server-side
title: Tag-filtered kb_query matches any provided tag
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/cli/tests/operations/discovery.test.ts
tags:
  - mcp
  - query
  - tags
  - unit
verification_scope: end_to_end
verification_perspective: internal
links:
  - type: validates
    target: SCEN-mcp-tag-filtering-server-side
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-ac563c71a2db5849de4f4f4b
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a50f2c502f50261f2dc53bb28dd92e536697075ad7758a3fe3fd4e599444636
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-25T13:16:35.957Z'
    finished_at: '2026-10-25T13:16:59.550Z'
    artifact_digest: cf8459326b19f6031e320cbb6d991c7d0884c855a504b2516edb633d2725e8da
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    binding_hash: adc842b98b4da10bd83c6c2a51a2800f8e19cb1f20b4444b93f7391b33ab133d
    fingerprint: 4a68d378bfccf5bbcb864681282860fea3e6c47eb55ca366f1dbdd460be75e1a
    fingerprint_components:
      contract: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
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
      - symbol_id: SYM-e2e-test-mcp-tag-filtering-server-side
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
Asserts that `kb_query` with a `tags` filter keeps any-of matching semantics and applies the filter before pagination. Executable coverage spans `packages/cli/tests/operations/discovery.test.ts` and `packages/mcp/tests/tools/query.test.ts`.
