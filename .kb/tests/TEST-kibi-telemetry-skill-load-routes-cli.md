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
    receipt_id: PR-056c6aa543c045895a74430f
    test_id: TEST-kibi-telemetry-skill-load-routes-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
    binding_hash: 314e93433a7b8b84c83448faf71a34b359780bd204e461a7a4a7c274cf58b0ff
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
