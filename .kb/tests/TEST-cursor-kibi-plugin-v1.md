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
    receipt_id: PR-e34d1c71fec54b958c4814ce
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: failed
    code_snapshot: 71b43ef38f0945d5febd8dad9a12223a2f13e5092564f8222974a6fb48fc1ea5
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T06:30:49.943Z'
    finished_at: '2026-09-06T07:22:27.216Z'
    artifact_digest: 874dd5c6d454cff93bdf784b60380ee2fa22f4058f4382076d931c84dde61ccd
    contract_hash: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
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
    run_outcome: failed
    proof_results:
      - symbol_id: SYM-e2e-test-cursor-kibi-plugin-v1
        target: default
        outcome: failed
        binding: aggregate_run
        attempts:
          status: unavailable
    gaps:
      - symbol_id: SYM-e2e-test-cursor-kibi-plugin-v1
        target: default
        reason: 'run did not pass (outcome: failed); this obligation''s own result outcome is ''failed''; failing member result(s): SYM-test-packed-dependency-ordered-repair-plan (failed), SYM-e2e-packed-cli-github-report (failed), SYM-test-core-journaled-engine-delta-sync (failed), SYM-test-opencode-bootstrap-paths (failed), SYM-codex-packed-plugin-e2e (failed) +83 more'
  - version: kibi.proof-receipt.v1
    receipt_id: PR-bd653c1321296f7464108e0b
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 9648b885459e3a707873828ffc71810a3f3087e64d820acb1e5c20c4d424ee78
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T08:03:27.689Z'
    finished_at: '2026-09-06T08:53:08.385Z'
    artifact_digest: a9446e6bf639a8313722c309e3e6a6bf674e647b465bc9a1f94f58e2956e82a6
    contract_hash: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-a46967b7212999f4d4d81d94
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 7a4310b9bccfd5ad2dc5dee7081fe78f9a64ccd5e179422b91542bb71e857382
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T09:14:02.169Z'
    finished_at: '2026-09-06T09:59:05.533Z'
    artifact_digest: 9700ae4ded2511c37e52dea96afb2ea71ea74ee07cd3bfef21fcf341d6714563
    contract_hash: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
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
  - version: kibi.proof-receipt.v1
    receipt_id: PR-b7cf97a087cf010ebf832966
    test_id: TEST-cursor-kibi-plugin-v1
    scope: end_to_end
    outcome: passed
    code_snapshot: 877cc6202786943ab48c6e5914d1be7d4635e7e4450368b7cbb1cfbd537aeded
    environment_hash: 75a5663e12b090d190cceb0443c194b5382c42227c663ee5fee9994dbda6ea62
    started_at: '2026-09-06T10:13:05.534Z'
    finished_at: '2026-09-06T11:02:05.222Z'
    artifact_digest: 3da3eeee7d1f0f1eba5c4f27b12c053492661a41debcb4cc9944e6b22926a852
    contract_hash: c179dda4770841e83866552ddcd6f75d3192ebc8a970b1c71a6346feb794a759
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
---

Verification for `kibi-cursor` documentation and plugin onboarding guidance includes:

- Ensure `packages/cursor/.cursor-plugin/plugin.json` exports plugin manifest paths and MCP config for the project-local `kibi-mcp` server.
- Ensure `.cursor-plugin/marketplace.json` exposes `kibi-cursor` from `plugins/kibi-cursor` for repo-scoped Cursor marketplace installs.
- Ensure installation guidance in `README.md`, `packages/cursor/README.md`, and `docs/install.md` states `kibi-cursor` is optional and keeps `kibi-core`, `kibi-cli`, `kibi-mcp`, and SWI-Prolog as foundational dependencies.
- Ensure marketplace and plugin descriptions document prerequisites before enabling the bundled MCP server.
- Ensure the optional Cursor plugin section documents hook bundle behavior and fallback/manual MCP configuration.
- Ensure `docs/architecture.md` models the Cursor plugin as an adapter layer that connects to MCP/Kibi rather than replacing storage or core CLI behavior.
- Ensure repo dogfood wiring documents `.cursor/mcp.json`, `.cursor/hooks.json`, and `scripts/sync-cursor-dogfood.sh` for local artifact testing.
