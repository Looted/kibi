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
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bfbf21d9404c5263176532cc
    test_id: TEST-kibi-scenario-feasibility
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: cd3f4cd9c036efe26737cd01caa216c9a57776965ecedfc7faec7e5df3ce5e79
    binding_hash: 804cae6e7b70ea11e9ce0a19e19a7c3f9e77059e9ca9f6f410c2b351cdfe94ac
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
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Consumer CLI flags infeasible success scenarios and clears them with an approved exception

In a fresh `kibi init` workspace, `packages/cli/tests/consumer/scenario-feasibility.test.ts` authors a requirement `client.call_quota.remaining > 0`, a success scenario and a rejection scenario that both assume `remaining = 0`, then drives the built CLI: `kibi check --rules scenario-feasibility` reports only the success scenario and names the requirement and both facts, `kibi coverage` gives the requirement the `infeasible_scenario` gap, and an exception requirement that `exempts` the base requirement and is `specified_by` the scenario clears both while the base requirement stays open.

The `kb_scenario_feasibility` plunit unit in `packages/core/tests/kb.plt` covers the rule directly.
