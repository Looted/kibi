---
title: Bootstrap planner/apply integration and journal recovery
status: passing
sourceFile: packages/cli/tests/operations/apply-plan.test.ts
verification_scope: end_to_end
verification_perspective: internal
id: TEST-KIBI-BOOTSTRAP-PLAN-APPLY
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-kibi-bootstrap-plan-apply
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0341dde9ed0fd6d80efd112b
    test_id: TEST-KIBI-BOOTSTRAP-PLAN-APPLY
    scope: end_to_end
    outcome: passed
    code_snapshot: 48cc5f2c6340fb17a7d99816b8c9a340c61bcad65b834285c14663cdc1f2d7fa
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T19:23:45.832Z'
    finished_at: '2026-10-28T19:25:41.440Z'
    artifact_digest: c241219cb006209aa162986be604a5ce4aeaafcde48e8ae71d5f522d596c3d14
    contract_hash: 906cca7199309d273a9dc61b3a175e23e3f2fe82764c51173ada6cf69c4404db
    binding_hash: f00531eddaec50bf187b3171aadefcd576a90d169b783346a9ccc6ee352915a4
    fingerprint: d1c4ba3eb0ee1a1e0d812dd0e2b9febb776704c1fd7006fdb30ccf46462d3094
    fingerprint_components:
      contract: 906cca7199309d273a9dc61b3a175e23e3f2fe82764c51173ada6cf69c4404db
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
      - symbol_id: SYM-e2e-test-kibi-bootstrap-plan-apply
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
tags:
  - review:context-missing
---