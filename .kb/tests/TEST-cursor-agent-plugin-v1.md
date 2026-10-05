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
    - symbol_id: SYM-e2e-test-cursor-agent-plugin-v1
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-6b391106c89a536ae1adf5f9
    test_id: TEST-cursor-agent-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 4705cdbd5bce2e24ad5a429b45fcb077d715f8d952984c383115583a49f1bf54
    binding_hash: 722b326a200bdf3db2d06737a8d0f886a2849d51f8b0035a472d482b001bcb3c
    fingerprint: 2c6a3d7a42c67269eb2d6a99142c12b6429c5c1b3c7989786c165b18193f9ecd
    fingerprint_components:
      contract: 4705cdbd5bce2e24ad5a429b45fcb077d715f8d952984c383115583a49f1bf54
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
      - symbol_id: SYM-e2e-test-cursor-agent-plugin-v1
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
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
