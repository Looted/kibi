---
id: TEST-mcp-suggest-predicates
title: Predicate suggestion MCP tool behavior tests
status: passing
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-06-01T00:00:00.000Z
source: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - mcp
  - ontology
  - predicates
  - unit
links:
  - type: validates
    target: SCEN-mcp-suggest-predicates
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-predicate-suggestion-relevance
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-de23aa66e284d421abca7f8f
    test_id: TEST-mcp-suggest-predicates
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: e092b6bf33d7fd29a52293aee3315f2f79eacd27f5ff919cbfef4bcfc58cab1b
    binding_hash: 423a2ac5883f4d814b6b598faf6d6387286798fd6d216bfbb65ccda2691a20b0
    fingerprint: 33139d2d3b766b02cc220617d1c855d2dffbe74f55cdacb7d405fff19097cec0
    fingerprint_components:
      contract: e092b6bf33d7fd29a52293aee3315f2f79eacd27f5ff919cbfef4bcfc58cab1b
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
      - symbol_id: SYM-e2e-predicate-suggestion-relevance
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
Verifies predicate candidate ranking, safe apply-plan generation, existing schema loading, relationship guidance, argument validation, declared-schema argument binding, prohibition polarity preservation, and ontology-gap fallback behavior for `kb_suggest_predicates`.
