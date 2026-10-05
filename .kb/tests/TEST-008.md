---
id: TEST-008
title: End-to-end init then sync then query then check pipeline passes
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - integration
  - e2e
  - cli
links:
  - type: validates
    target: SCEN-001
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-008
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-f53e066b28c24d15ebb2437d
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: e52cbb5232cad4031f5720af6f18b9ecfb1bd04971bbcf1edd9beab77a7e7033
    fingerprint: f76f64260b21f39ce4c5a37bee01a627ed3189fe67ef326c013faff11dca4b77
    fingerprint_components:
      contract: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
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
      - symbol_id: SYM-e2e-test-008
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

Full pipeline in a temp directory:
1. `kibi init` — asserts exit 0
2. Place requirement and scenario markdown files with correct `links`
3. `kibi sync` — asserts exit 0 and entity count > 0
4. `kibi query req --format json` — asserts valid JSON array
5. `kibi check` — asserts exit 0 (coverage satisfied by the seeded scenario)
