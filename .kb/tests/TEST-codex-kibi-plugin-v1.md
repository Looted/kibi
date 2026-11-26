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
    receipt_id: PR-be42204109ae2ba4b8068b3e
    test_id: TEST-codex-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 60d395be019e9a2a7e51c59ea05f06a97cb442526eac2d365ae6b510d12c7327
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-26T12:08:52.925Z'
    finished_at: '2026-11-26T12:08:53.384Z'
    artifact_digest: e069961da06e625f7527b1181881623ef1e39cde180b2f013fc3abf3236b3a38
    contract_hash: 225185634f9f1b9816a2d74ea7a65dc18ff99a36f9b771a6dc769e60a80590a4
    binding_hash: aea2fe84895b9ccba30eec17875bd803c9a56b136d05c5762983139c41683e56
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
