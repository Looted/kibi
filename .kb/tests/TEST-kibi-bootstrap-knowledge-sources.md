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
    receipt_id: PR-ac0caa134df505a57c02f86d
    test_id: TEST-kibi-bootstrap-knowledge-sources
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 3d128a63c4325d14a97c40cb5918cbfdd44628f5232df93aca528205bbf34ab9
    binding_hash: 2078bf8783f613e8055192040afa5c875212a8bc824011a74c32c6ecaf70e789
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
