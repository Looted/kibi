---
id: TEST-opencode-kibi-plugin-v1
title: OpenCode Kibi Plugin v1 Automated Verification
status: active
created_at: 2026-03-13T00:00:00.000Z
updated_at: 2026-04-20T00:00:00.000Z
priority: must
tags:
  - opencode
  - kibi
  - test
  - enforcement
links:
  - type: validates
    target: SCEN-opencode-kibi-plugin-v1
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-opencode-kibi-plugin-v1
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-dfd3558e6e0e9246c220856b
    test_id: TEST-opencode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 10a72d3ea173ef395ace4a6d542790685d0190f95e2ea21d4d55876e045cc73e
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:03:01.145Z'
    finished_at: '2026-10-29T17:04:51.022Z'
    artifact_digest: 4a0714b044ab8e24ba412cea73ddc4a9ff293b8c0ad74b7217f892d966979ab1
    contract_hash: 95a017a95da0a71e9960aaa651856c13c4fd2366f724507979f61222cc456a80
    binding_hash: 4f7acd0b91ed28c90f983dc27e63ddb89807c1a1df35348d2b1baa02bdf38713
    fingerprint: 383b0bb3500edea66e225543df1452b730d0b6b1b55b59e22c33fb3faf09095f
    fingerprint_components:
      contract: 95a017a95da0a71e9960aaa651856c13c4fd2366f724507979f61222cc456a80
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
      - symbol_id: SYM-e2e-test-opencode-kibi-plugin-v1
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
Verify the OpenCode plugin routes initial repository inference through kibi-bootstrap and the exact plan/apply contract, while normal work follows typed status and canonical skills.
