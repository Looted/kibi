---
id: TEST-cursor-kibi-plugin-v1
title: Cursor Kibi Plugin v1 Verification
status: active
created_at: 2026-06-09T00:00:00.000Z
updated_at: 2026-06-09T00:00:00.000Z
priority: must
tags:
  - test
  - kibi
  - cursor
  - plugin
  - verification
links:
  - type: validates
    target: SCEN-cursor-kibi-plugin-v1
  - type: relates_to
    target: REQ-cursor-kibi-plugin-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-cursor-kibi-plugin-v1
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-fe6854d129f97468190ae23d
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
    binding_hash: 43ac4127466102f36e1ee0aba35aadaf867693a37d82363f7a6bcdb1e16b2d8e
    fingerprint: f33c89d0790a58c84dae06ba8c448ce4baf441865974c1c35c6a3467bf603b9c
    fingerprint_components:
      contract: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
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
      - symbol_id: SYM-e2e-test-cursor-kibi-plugin-v1
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
Verification for `kibi-cursor` documentation and plugin onboarding guidance includes:

- Ensure `packages/cursor/.cursor-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.cursor-plugin/marketplace.json` exposes `kibi-cursor` from `plugins/kibi-cursor` for repo-scoped Cursor marketplace installs.
- Ensure installation guidance in `README.md`, `packages/cursor/README.md`, and `docs/install.md` states `kibi-cursor` is optional and keeps `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as foundational dependencies.
- Ensure marketplace and plugin descriptions document prerequisites before enabling the bundled MCP server.
- Ensure the optional Cursor plugin section documents hook bundle behavior and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Cursor plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure repo dogfood wiring documents `.cursor/mcp.json`, `.cursor/hooks.json`, and `scripts/sync-cursor-dogfood.sh` for local artifact testing.
