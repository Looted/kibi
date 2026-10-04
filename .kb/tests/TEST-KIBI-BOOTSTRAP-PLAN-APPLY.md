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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4600bc64872454160efc3e86
    test_id: TEST-KIBI-BOOTSTRAP-PLAN-APPLY
    scope: end_to_end
    outcome: passed
    code_snapshot: 8499760987e65cd54cd3080da17ff96b7569bf5ef7311a9ae345e9ee359a2a39
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-10-04T18:26:52.436Z'
    finished_at: '2026-10-04T18:31:33.206Z'
    artifact_digest: 05051ac71054ecb8d8c06601fdc5a643b333d7c89033fec7113d8de1e12496ce
    contract_hash: 906cca7199309d273a9dc61b3a175e23e3f2fe82764c51173ada6cf69c4404db
    binding_hash: ab4944580db7fd5871371354a5d6f0eb59a419f7496728216190d9a6174a1c49
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
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---