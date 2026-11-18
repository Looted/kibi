---
id: TEST-codex-kibi-plugin-v1
title: Codex Kibi Plugin v1 Verification
status: passing
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
priority: must
tags:
  - test
  - kibi
  - codex
  - plugin
  - verification
links:
  - type: validates
    target: SCEN-codex-kibi-plugin-v1
  - type: relates_to
    target: REQ-codex-kibi-plugin-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
      target: default
  success_policy: all_required_first_attempt
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f56fbc49afbff25446fa7a3a
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 6ba033523eaf1599c4d3efc3d15e2d78ec425f30d68a8184efef61a383b87869
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-18T08:28:20.919Z'
    finished_at: '2026-11-18T08:29:41.716Z'
    artifact_digest: cd77ec0d8d376733c06c7a858dffde4874490e60f95b54d944b1da5f998af1a2
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: 9eba98790e03da888944b1c915f3ce13482858a31d4d419607f603c9a1370284
    fingerprint: 133a62efa1887f07110626727e5ba988871f147fbd9c990bc4ebf9db489ac263
    fingerprint_components:
      contract: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
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
      - symbol_id: SYM-e2e-test-codex-kibi-plugin-v1
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
Verification for `kibi-codex` documentation and plugin onboarding guidance includes:

- Ensure `packages/codex/.codex-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.agents/plugins/marketplace.json` exposes `kibi-codex` from `./packages/codex` for repo-scoped Codex marketplace installs.
- Ensure installation guidance in `README.md` and `docs/install.md` states `kibi-codex` is optional and keeps `kibi-core`, `kibi-cli`, and `kibi-mcp` as foundational runtime dependencies.
- Ensure installation guidance documents `codex plugin marketplace add Looted/kibi` and explains that official OpenAI Plugin Directory self-serve publishing is not yet available.
- Ensure the optional Codex plugin section documents hook bundle behavior, required plugin trust review, and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Codex plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure no documentation claims official marketplace acceptance as already complete.
