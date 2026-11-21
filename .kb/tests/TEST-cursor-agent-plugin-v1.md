---
id: TEST-cursor-agent-plugin-v1
title: Portable Agent Plugin Artifact Verification
status: passing
created_at: 2026-08-07T00:00:00.000Z
updated_at: 2026-08-07T00:00:00.000Z
priority: must
tags:
  - test
  - kibi
  - cursor
  - agent-plugins
  - verification
links:
  - type: validates
    target: SCEN-cursor-agent-plugin-v1
  - type: relates_to
    target: REQ-cursor-agent-plugin-standard-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-cursor-plugin-launcher
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-4e3aa1ed55450808a6c3e6b7
    test_id: TEST-cursor-agent-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
    contract_hash: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
    binding_hash: fa7a6be5816e579e86b191df8306b6870e41ba30d2329f0b6b88706074b8baec
    fingerprint: 6c65d7222ec22bd95e3fe85dced1940edecb8f0713acff4ec85e019186ac8b29
    fingerprint_components:
      contract: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
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
      - symbol_id: SYM-e2e-cursor-plugin-launcher
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
Verification for the portable Agent Plugin artifact (`packages/cursor/tests/agent-plugin.test.ts`) includes:

- Ensure `agent-plugin/plugin.json` declares the Agent Plugins 1.0.0 `$schema`, a schema-valid `name`, and only manifest-allowed top-level keys.
- Ensure `agent-plugin/mcp.json` declares the Agent Plugins MCP `$schema`, a `kibi` server with `type: "stdio"`, and a string `command`.
- Ensure `agent-plugin/skills/` contains every canonical skill ID with its `SKILL.md`.
- Ensure regenerating the artifact via `buildAgentPluginUnlocked` produces a tree identical to the committed artifact (no drift).
- Ensure the artifact `version` tracks the `kibi-cursor` package.json version.
- Ensure startup resolution leaves an explicitly launched MCP build in control when the current workspace has no package manifest, rather than re-entering an ambient cached package.
