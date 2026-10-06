---
title: Consumer CLI links a scenario to an existing requirement without resending its ledger and records a review observation quoting its claim
status: passing
priority: must
tags:
  - upsert
  - semantic-inventory
  - observation
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:41:49.452Z'
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-upsert-review-lanes
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-upsert-review-lanes
    target: default
    native_id: packages/cli/tests/consumer/upsert-review-lanes.test.ts::kb_upsert review lanes through the real CLI::links a scenario without resending the ledger and records a review observation quoting its claim
    source_file: packages/cli/tests/consumer/upsert-review-lanes.test.ts
    line: 53
id: TEST-kibi-upsert-review-lanes
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-3f20147f2d646b645ddaf3ce
    test_id: TEST-kibi-upsert-review-lanes
    scope: end_to_end
    outcome: passed
    code_snapshot: ec480f6c8ccedffe4f23146d0e965bc532d9e2ade544a4d91739d094126fb2f2
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-06T22:19:47.866Z'
    finished_at: '2026-10-06T22:19:56.722Z'
    artifact_digest: 2463d40f9fd0235b82a9fa2262b38042ec4d02955031f817a0404aedca9d9bc2
    contract_hash: cab93ebf47a70cfe27e6cb2f009b349cdb16d9b1b6cbba896142c60ffb6649dd
    binding_hash: 2d4555da963b53776677e37a49fa25031b4bb785d41a099901389c0e5355003c
    fingerprint: 44de6a154006148b15086f80de6d0833f2e55be829e3ac44b5c95b9028863e06
    fingerprint_components:
      contract: cab93ebf47a70cfe27e6cb2f009b349cdb16d9b1b6cbba896142c60ffb6649dd
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 7e3a261a3e22ab5537ddf2193716ebb8fe1fbf77edc077f09f29ff460b07ae8f
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-upsert-review-lanes
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# kb_upsert review lanes

`packages/cli/tests/consumer/upsert-review-lanes.test.ts` applies a bootstrap plan through the built CLI, links a scenario to the written requirement with a relationship-only `kb_upsert`, checks that a prose change without a ledger is still refused, writes a `review:invalid-write` observation that quotes its claim in `claim_text`, and checks that a `property_value` fact with `claim_text` but no `claim_key` is refused. After sync the requirement keeps its inventory and `kb_check` reports no violations.
