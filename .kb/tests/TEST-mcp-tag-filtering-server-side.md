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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-980d09ec3e89a63660ade6a1
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: a1910f0eebcde372209a607e53570b6f367fcdfe2e80557f03c46d13c2abe254
    binding_hash: 325d2f0b9e8a26a6de1ecfbc55c0293a1aecc6b5c372554073e399760f85d40e
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Asserts that `kb_query` with a `tags` filter keeps any-of matching semantics and applies the filter before pagination. Executable coverage spans `packages/cli/tests/operations/discovery.test.ts` and `packages/mcp/tests/tools/query.test.ts`.
