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
    receipt_id: PR-dfc8870a9513eee8336c55fb
    test_id: TEST-opencode-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:49:18.754Z'
    finished_at: '2026-10-30T19:49:28.200Z'
    artifact_digest: 7785eca9868d6b2aa4be0bd1836b39620928e903b4709f4827cc56396c4455e9
    contract_hash: 95a017a95da0a71e9960aaa651856c13c4fd2366f724507979f61222cc456a80
    binding_hash: 8b473073cfd16fb214b3736cefea0f6d3abd89cb48d017b33360b7ddf4bc8bc2
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
