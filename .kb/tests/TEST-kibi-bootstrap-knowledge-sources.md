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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5e04368f2be2f4219a1509b0
    test_id: TEST-kibi-bootstrap-knowledge-sources
    scope: end_to_end
    outcome: passed
    code_snapshot: 7b7cf5b5106d1cb9499e416a459b67802d2ab05831deaae6da49264bb5bb9465
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:20:09.068Z'
    finished_at: '2026-10-28T19:20:09.902Z'
    artifact_digest: d19a517a379744bfbae2fe5a08bcfc727a84ae036816904f0245295493af8a2e
    contract_hash: 3d128a63c4325d14a97c40cb5918cbfdd44628f5232df93aca528205bbf34ab9
    binding_hash: d99d9856e39788b9b6b76523d36e6d357e732a3081b7cf6cfb271ee6d9931751
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
