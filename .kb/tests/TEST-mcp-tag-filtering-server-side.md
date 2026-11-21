---
id: TEST-mcp-tag-filtering-server-side
title: Tag-filtered kb_query matches any provided tag
status: passing
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
    - symbol_id: SYM-e2e-mcp-cli-operation-parity
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2528ec463ec16c4d7032719c
    test_id: TEST-mcp-tag-filtering-server-side
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
    binding_hash: 85975cd443558d61fe1864dfcf4dcee87c76689829e117439b90bf3072320fdc
    fingerprint: 10eff81d0bc3303e3c216878cb7d8d04f482e9e8c5fedb54c67b66ea0199712f
    fingerprint_components:
      contract: 16c8ca5924f1d2e8c40217057c8cd8ac04745dfafde4772670d5c2a2437b938a
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
      - symbol_id: SYM-e2e-mcp-cli-operation-parity
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
