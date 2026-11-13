---
title: A skill loaded through the kibi CLI marks later operations in that workspace, and no other
status: passing
priority: should
tags:
  - telemetry
  - privacy
  - cli
  - agent-core
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
    target: default
    native_id: packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts::kibi CLI skill load telemetry (end to end)::a skill loaded through the CLI marks later operations in that workspace
    source_file: packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts
    line: 267
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: TEST-kibi-telemetry-skill-load-routes-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1e183c7181edaf55257f4a97
    test_id: TEST-kibi-telemetry-skill-load-routes-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 7e6c189cb19db3329b39243bbd1d9c444019f127086cda9058aeab2c530bd46c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T20:22:30.370Z'
    finished_at: '2026-11-13T20:22:44.169Z'
    artifact_digest: 41c061311f92f4f70e58358deab81b51777de76384b649c4718997e8ed5fde9f
    contract_hash: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
    binding_hash: daf21a0809c38314684e584d9e894653e7fe9dc65308c025250bfcf65e49d150
    fingerprint: cec4636da50e859913822a41f7d0deed0a14a6e4c9275fd21fe65352079a0f7e
    fingerprint_components:
      contract: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: d4bd08bc1425499bbc32ae0919831612e51e64ba0e93b58765aa13b30b5106c7
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-kibi-telemetry-expected-outcomes-cli
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` binary in two new git workspaces against a local stand-in for the PostHog batch endpoint (`packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts`). The first workspace sits inside a plain parent directory.

It runs `kibi status` in the first workspace, `kibi skills load kibi-usage --format json` in the parent directory, `kibi status` in the workspace, the same load from a subdirectory of the workspace, then `kibi status` in the workspace and in the second workspace, then enough commands to make the queue due. It checks that the six events report `skill_loaded_before` false, false, false, false, true and false, and that the sent payload holds neither the parent directory's path nor the second workspace's.

The MCP side is covered by `packages/mcp/tests/server/skill-load-telemetry-routing.test.ts`: a real kibi-mcp started in a parent directory routes `kb_skills` calls to two workspaces below it, and only the workspace whose routed call loaded the skill reports `skill_loaded_before` true.
