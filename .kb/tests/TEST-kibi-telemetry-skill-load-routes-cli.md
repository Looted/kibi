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
    line: 265
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for skill loads through the CLI and MCP and for telemetry in SkillOpt harness processes: "Ok"'
  recorded_at: '2026-11-13T10:00:00.000Z'
id: TEST-kibi-telemetry-skill-load-routes-cli
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c132aa89b7750d8ebc17ccdf
    test_id: TEST-kibi-telemetry-skill-load-routes-cli
    scope: end_to_end
    outcome: passed
    code_snapshot: 964a581acb197040e905a60f9b18a2e6a9b04fc024876131f1e3675cfa5f26ff
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-13T09:34:18.016Z'
    finished_at: '2026-11-13T09:34:25.144Z'
    artifact_digest: dce8266aed4ec1c3869c2c9c771e35a9e25798c178d40e440fb2e0226785f46b
    contract_hash: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
    binding_hash: 255215bf51a95bc9d84b8e98f660c6494690c1d38bac6be4edf060647e97ada1
    fingerprint: b5cc7415bc741f06fe19a1d7621a39154e358855f2236b93449362f34887d2f8
    fingerprint_components:
      contract: f60e6a5423f0b2f6f65a5f5cdfdf5a4444133304a6594f17d54e55ec8b79cdd1
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: a9fa51473aa87d38ed0301e1a02646a4bf708d300f7a11b5ab7b93cb54e66256
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
Runs the real `kibi` binary in two new git workspaces against a local stand-in for the PostHog batch endpoint (`packages/cli/tests/usage-telemetry-outcomes-e2e.test.ts`).

It runs `kibi status`, `kibi skills load kibi-usage --format json` and `kibi status` in the first workspace and `kibi status` in the second, then enough commands to make the queue due. It checks that the four events report `skill_loaded_before` false, false, true and false, and that the sent payload holds neither workspace path.