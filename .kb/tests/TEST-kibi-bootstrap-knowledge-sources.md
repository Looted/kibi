---
title: Bootstrap planner consolidates cited intent claims from declared knowledge sources
status: passing
tags:
  - bootstrap
  - knowledge-sources
id: TEST-kibi-bootstrap-knowledge-sources
type: test
verification_perspective: internal
verification_scope: end_to_end
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-bootstrap-knowledge-sources
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-85e78c7540fd163c5848e4b9
    test_id: TEST-kibi-bootstrap-knowledge-sources
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 3d128a63c4325d14a97c40cb5918cbfdd44628f5232df93aca528205bbf34ab9
    binding_hash: 2c9f723ad2586383717ba884a24a755914e2256c0cb384b5623d0ad551190bf1
    fingerprint: fa4bdaff830ce5c978d5f23947fe09dc55f88bd8e0ea3d35c51414448bb1c9d5
    fingerprint_components:
      contract: 3d128a63c4325d14a97c40cb5918cbfdd44628f5232df93aca528205bbf34ab9
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
      - symbol_id: SYM-test-kibi-bootstrap-knowledge-sources
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
# Bootstrap knowledge sources

`packages/cli/tests/operations/bootstrap-intent-claims.test.ts` runs the public `kb_plan_bootstrap` operation on a thin repository with declared sources and claims and checks cited req candidates, follow-ups, stale suppression, undeclared-source diagnostics, plan-hash binding, and the missing-sources question.
