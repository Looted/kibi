---
title: Bootstrap planner consolidates cited intent claims from declared knowledge sources
status: active
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-897b3dc432c3c28cff677fc8
    test_id: TEST-kibi-bootstrap-knowledge-sources
    scope: end_to_end
    outcome: passed
    code_snapshot: d8e773f5b16aa79385608bcb6c707449c5c125fa4aea0c9440900e44001a9442
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-10-02T07:53:06.448Z'
    finished_at: '2026-10-02T07:53:06.820Z'
    artifact_digest: 0fe904a45ae2b79d530544fbefa2f35cba08de23f697fca87a390fe78722aed8
    contract_hash: 3d128a63c4325d14a97c40cb5918cbfdd44628f5232df93aca528205bbf34ab9
    binding_hash: 379f7684f8a0b181f2b4efb68bd2bb17a452ae9c6adedde58ed58dba4770b946
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Bootstrap knowledge sources

`packages/cli/tests/operations/bootstrap-intent-claims.test.ts` runs the public `kb_plan_bootstrap` operation on a thin repository with declared sources and claims and checks cited req candidates, follow-ups, stale suppression, undeclared-source diagnostics, plan-hash binding, and the missing-sources question.
