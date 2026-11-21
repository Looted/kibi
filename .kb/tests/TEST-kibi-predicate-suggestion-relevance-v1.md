---
title: Predicate Suggestion Relevance End-to-End Contract
status: passing
priority: must
text_ref: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - kibi
  - mcp
  - ontology
  - predicates
  - relevance
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
      target: default
  success_policy: all_required_first_attempt
id: TEST-kibi-predicate-suggestion-relevance-v1
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3db1033a38366606286949c1
    test_id: TEST-kibi-predicate-suggestion-relevance-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 591f5200542a98be532340312e47ae45a2d9fc3475eaa6db6c7abfa6d063bf37
    binding_hash: 2df817f16787b0420002e7aacc09ee301d5e91a0c1e378bb4929424ffb246061
    fingerprint: 66c49dedca0fab50fa69126a13f443c32c13439ffc5fdb5d189a638b3b04e599
    fingerprint_components:
      contract: 591f5200542a98be532340312e47ae45a2d9fc3475eaa6db6c7abfa6d063bf37
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
      - symbol_id: SYM-kibi-predicate-suggestion-relevance-e2e
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 5): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Context
This checks the explanation fields (eligibility, rejection reasons, binding provenance, score parts), so a reviewer can see why a candidate was or wasn't recommended.
