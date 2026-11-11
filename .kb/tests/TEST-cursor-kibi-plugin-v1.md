---
id: TEST-cursor-kibi-plugin-v1
title: Cursor Kibi Plugin v1 Verification
status: passing
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
    - symbol_id: SYM-e2e-cursor-plugin-launcher
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-5f87db046fdd564d40919325
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 77a05ac3f136388d07560216e6f9644997c4b9918c6920a54149f03a47779bca
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-10T05:36:13.194Z'
    finished_at: '2026-11-10T05:36:32.774Z'
    artifact_digest: 58aa2d713801fb48ae6fcb177a5de5ceefaed293bd1d55893867c819f2e343a6
    contract_hash: 0aac345636937bdd9ce5c4e2aa8db27285162f421f307d69df3fbd66ad5fbe68
    binding_hash: 7b0c6ba4fe1a2124d817648349366fc21afa5ce601bc8d416aff26bd2061f5bb
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
Verification for `kibi-cursor` documentation and plugin onboarding guidance includes:

- Ensure `packages/cursor/.cursor-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.cursor-plugin/marketplace.json` exposes `kibi-cursor` from `plugins/kibi-cursor` for repo-scoped Cursor marketplace installs.
- Ensure installation guidance in `README.md`, `packages/cursor/README.md`, and `docs/install.md` states `kibi-cursor` is optional and keeps `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as foundational dependencies.
- Ensure marketplace and plugin descriptions document prerequisites before enabling the bundled MCP server.
- Ensure the optional Cursor plugin section documents hook bundle behavior and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Cursor plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure repo dogfood wiring documents `.cursor/mcp.json`, `.cursor/hooks.json`, and `scripts/sync-cursor-dogfood.sh` for local artifact testing.
