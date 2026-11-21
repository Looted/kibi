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
  ref: 'Maintainer request, 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-56efc6e94948a4c7d99d2b6d
    test_id: TEST-kibi-upsert-review-lanes
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: cab93ebf47a70cfe27e6cb2f009b349cdb16d9b1b6cbba896142c60ffb6649dd
    binding_hash: 538ede3d37c57fc474613c61f489d1310849c4e59332b37a60480e3e61b35034
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
    kind: e2e
    evidence_level: tested
---
# kb_upsert review lanes

`packages/cli/tests/consumer/upsert-review-lanes.test.ts` applies a bootstrap plan through the built CLI, links a scenario to the written requirement with a relationship-only `kb_upsert`, checks that a prose change without a ledger is still refused, writes a `review:invalid-write` observation that quotes its claim in `claim_text`, and checks that a `property_value` fact with `claim_text` but no `claim_key` is refused. After sync the requirement keeps its inventory and `kb_check` reports no violations.
