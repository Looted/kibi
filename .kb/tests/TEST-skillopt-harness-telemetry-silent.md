---
title: SkillOpt fixture CLI runs and bounded child processes run with Kibi telemetry off
status: passing
priority: should
tags:
  - skillopt
  - telemetry
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-skillopt-harness-telemetry-silent
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-skillopt-harness-telemetry-silent
    target: default
    native_id: scripts/skillopt-eval/tests/telemetry-env.test.ts::harness child environment::a Kibi CLI run in a fixture environment queues no telemetry (end to end)
    source_file: scripts/skillopt-eval/tests/telemetry-env.test.ts
    line: 41
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: TEST-skillopt-harness-telemetry-silent
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e5ecd871c7c25638483810aa
    test_id: TEST-skillopt-harness-telemetry-silent
    scope: end_to_end
    outcome: passed
    code_snapshot: 964a581acb197040e905a60f9b18a2e6a9b04fc024876131f1e3675cfa5f26ff
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T09:34:14.742Z'
    finished_at: '2026-11-13T09:34:15.600Z'
    artifact_digest: 615bbb76cbd28718f8e166c111d2b3e4f3be0bfe97550a172e379db19c314d07
    contract_hash: 7e58388ba7f082849d164d2ec0cf919d4d767d6ac09a229e5e5fc9913ba56dd2
    binding_hash: e2d8f663ce50080db1b5363f4ef19722a27d6cbb730cdfebf9cce6aa1e1d79fd
    fingerprint: 5bb79fb68d65b47895ace245a09eebaf4cf3ef27cce63cd0e725e0d81d6ee4db
    fingerprint_components:
      contract: 7e58388ba7f082849d164d2ec0cf919d4d767d6ac09a229e5e5fc9913ba56dd2
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: be8e81147752c9e9a83ebd7ed7337df7538494594b0de2bb983d151b6800a60a
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-skillopt-harness-telemetry-silent
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi status` in a new git workspace (`scripts/skillopt-eval/tests/telemetry-env.test.ts`). With `KIBI_TELEMETRY=1` and no harness environment it checks that an event is queued; with the operator environment set to `KIBI_TELEMETRY=1` it checks that `fixtureCliEnv` sets `KIBI_TELEMETRY=0`, that the run with that environment queues nothing, and that a child started by `runBoundedProcess` sees `KIBI_TELEMETRY=0`.