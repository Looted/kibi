---
title: Syntax-only TypeScript provider tests
status: passing
priority: must
verification_scope: end_to_end
tags:
  - plugins
  - symbols
  - typescript
  - performance
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:00.000Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-builtin-ts-syntactic-parse
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-builtin-ts-syntactic-parse
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-487ba36719e29a6ba453b1e2
    test_id: TEST-kibi-builtin-ts-syntactic-parse
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: e815d5aefc25d2c632e3af1fdd1800456f3e0a0af7197a681e63f5bc0d65a649
    binding_hash: 73098865992f429a858b3177f8cfa42d57905bd8f2b29ebc5cc18766d2bdc738
    fingerprint: 6e8475680b7e396ab1a8c92ea17c0120dd13ed72153f27f5b9271b5b7b82cdc0
    fingerprint_components:
      contract: e815d5aefc25d2c632e3af1fdd1800456f3e0a0af7197a681e63f5bc0d65a649
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
      - symbol_id: SYM-test-kibi-builtin-ts-syntactic-parse
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks that the builtin TypeScript extractors, granularity candidates and coordinate enrichment parse files into a project without library declarations or import resolution, and still find names exported through a local export list.