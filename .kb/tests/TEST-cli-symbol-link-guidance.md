---
title: 'CLI: a links-only update on a class symbol is refused with its granular members, and symbol-coverage names the missing verified_by'
status: passing
priority: must
tags:
  - cli
  - symbol
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-symbol-link-guidance
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-cli-symbol-link-guidance
    target: default
    native_id: packages/cli/tests/commands/symbol-link-guidance.test.ts::symbol link guidance::a coarse link is refused when it is written, an invalid dry run is an error, and symbol-coverage names the missing test link
    source_file: packages/cli/tests/commands/symbol-link-guidance.test.ts
    line: 69
origin:
  kind: agent
  recorded_at: '2026-10-15T15:56:21.012Z'
id: TEST-cli-symbol-link-guidance
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-4fc8597526f374bccd93b70a
    test_id: TEST-cli-symbol-link-guidance
    scope: end_to_end
    outcome: passed
    code_snapshot: 6a23dc78469d75b4760a7a78e34935d17253baeb2adc4e7e10e711683cba4fcd
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-15T16:02:32.165Z'
    finished_at: '2026-10-15T16:02:38.526Z'
    artifact_digest: 0205e9e65720a0f25a4d5294206205f6c1f23b76b380b7380119cc4fb66ef6f2
    contract_hash: 6275b3ccb28b642baa89fcb063f0d71098589b043560cbbf7b9db871979b42da
    binding_hash: 8f67e4fa07cf025bc452c688598c3a4f05868270341893bd59ca122f436566d8
    fingerprint: 5502a0aa11157ec3f912a723b84f319f9d16b14a233ce4a2c120283d194903be
    fingerprint_components:
      contract: 6275b3ccb28b642baa89fcb063f0d71098589b043560cbbf7b9db871979b42da
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: bb381efcbad96028d1f0c5924d933bd7eb11be4e82fb83e5a12d645c861adf4c
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-cli-symbol-link-guidance
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
Runs the CLI on a fresh KB with a class whose public methods are behavioral symbols. It asserts that adding links to the stored class symbol is refused with the granular candidates, also when the payload is only validated, that `kibi check` `symbol-coverage` on a method symbol whose test does not verify the scenario names `verified_by(SCEN-…, TEST-…)`, and that an invalid test status lists only the test values.
