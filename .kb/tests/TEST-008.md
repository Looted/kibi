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
    receipt_id: PR-61e5ad39b6dbf852fcc1acad
    test_id: TEST-008
    scope: end_to_end
    outcome: passed
    code_snapshot: 010a65baaf9a1937e0452025b72b783d76d3ca5c06e68a7a9479e2182a7b6d3b
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T06:34:19.896Z'
    finished_at: '2026-09-18T06:35:50.013Z'
    artifact_digest: 3ebcf0fb8a43812a6fc21888ebea4b3f4db49b8a475fe4430c02795bd5b7f6f5
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-789b37bf3bcbeb40a0331ca0
    test_id: TEST-008
    scope: end_to_end
    outcome: failed
    code_snapshot: 7b99d1487500adc31317021d966877ae85c5f1b35c445e4e2eba81f5817b6ff2
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-09-18T20:02:42.969Z'
    finished_at: '2026-09-18T20:31:25.898Z'
    artifact_digest: 850d5f8d5f9dd89931eb204bce21ebb0cb3bc1f225cb57b4689c908a940d782c
    contract_hash: 28866a73da4d9b432c2834175d9e1eece0a8877ddbc4972bbf43d432db12f531
    binding_hash: ce570475d7ce2fa874990f1c863db273d01149e017d9d937cf0d92665f5080e0
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-008
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-008
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-e2e-test-001 (failed), SYM-e2e-test-003 (failed), SYM-e2e-packed-cli-check (failed), SYM-e2e-test-005 (failed), SYM-test-packed-default-branch-sync-hooks (failed) +98 more'
---

Full pipeline in a temp directory:
1. `kibi init` — asserts exit 0
2. Place requirement and scenario markdown files with correct `links`
3. `kibi sync` — asserts exit 0 and entity count > 0
4. `kibi query req --format json` — asserts valid JSON array
5. `kibi check` — asserts exit 0 (coverage satisfied by the seeded scenario)
