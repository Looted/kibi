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
    receipt_id: PR-4539371f51bb922c2b29ea34
    test_id: TEST-KIBI-BOOTSTRAP-PLAN-APPLY
    scope: end_to_end
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:52:22.087Z'
    finished_at: '2026-10-30T19:53:19.471Z'
    artifact_digest: 0fbbef87f8de81b7d792260aeb8c79411ebc63315ea18c96a2291aa4c8ec728b
    contract_hash: 906cca7199309d273a9dc61b3a175e23e3f2fe82764c51173ada6cf69c4404db
    binding_hash: 3849bd6f177585d2a743c6dba6dc51ea532a2f6853f1b6172aa806b29e6469da
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