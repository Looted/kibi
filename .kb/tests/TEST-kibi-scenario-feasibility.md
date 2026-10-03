---
title: Consumer CLI flags infeasible success scenarios and clears them with an approved exception
status: passing
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - scenarios
  - checks
  - requirement-proof
  - scenario-feasibility
  - e2e
id: TEST-kibi-scenario-feasibility
type: test
priority: must
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-scenario-feasibility
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-scenario-feasibility
    target: default
    native_id: packages/cli/tests/consumer/scenario-feasibility.test.ts::scenario feasibility through the kibi CLI::flags a success scenario that assumes a forbidden value until an approved exception exempts it
    source_file: packages/cli/tests/consumer/scenario-feasibility.test.ts
    line: 45
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c26fecd234d4f8b17a10993d
    test_id: TEST-kibi-scenario-feasibility
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ddaab71cf19bb014696ada5289d3d8865791d7fa3692887622550b869d9ef15
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-03T10:03:02.919Z'
    finished_at: '2026-10-03T10:03:13.030Z'
    artifact_digest: e86442a8c179f9d4071c9720bbb3f485ba1569cbdea56cc1700c5a6dfb46c348
    contract_hash: cd3f4cd9c036efe26737cd01caa216c9a57776965ecedfc7faec7e5df3ce5e79
    binding_hash: c7914aba190e770e73945af91be5fac08ea7a705c7e363e20e1b80a6713e597c
    fingerprint: 59c4bf3fbc5e9a013231de71bf7f573b18d1b5d14f313a50c8f8dee8042f6444
    fingerprint_components:
      contract: cd3f4cd9c036efe26737cd01caa216c9a57776965ecedfc7faec7e5df3ce5e79
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: cc1f4faa1c35b245d17e27745beba9e05e5be4ecb4b8977a59750b4c53409533
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-scenario-feasibility
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
# Consumer CLI flags infeasible success scenarios and clears them with an approved exception

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/scenario-feasibility.test.ts` authors a requirement `client.call_quota.remaining > 0`, a success scenario and a rejection scenario that both assume `remaining = 0`, then drives the built CLI: `kibi check --rules scenario-feasibility` reports only the success scenario and names the requirement and both facts, `kibi coverage` gives the requirement the `infeasible_scenario` gap, and an exception requirement that `exempts` the base requirement and is `specified_by` the scenario clears both while the base requirement stays open.

The `kb_scenario_feasibility` plunit unit in `packages/core/tests/kb.plt` covers the rule directly.
