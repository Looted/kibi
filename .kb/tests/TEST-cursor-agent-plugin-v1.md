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
    receipt_id: PR-e8e74fbe760738fe83454451
    test_id: TEST-cursor-agent-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
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
