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
---

Verification for the portable Agent Plugin artifact (`packages/cursor/tests/agent-plugin.test.ts`) includes:

- Ensure `agent-plugin/plugin.json` declares the Agent Plugins 1.0.0 `$schema`, a schema-valid `name`, and only manifest-allowed top-level keys.
- Ensure `agent-plugin/mcp.json` declares the Agent Plugins MCP `$schema`, a `kibi` server with `type: "stdio"`, and a string `command`.
- Ensure `agent-plugin/skills/` contains every canonical skill ID with its `SKILL.md`.
- Ensure regenerating the artifact via `buildAgentPluginUnlocked` produces a tree identical to the committed artifact (no drift).
- Ensure the artifact `version` tracks the `kibi-cursor` package.json version.
- Ensure startup resolution leaves an explicitly launched MCP build in control when the current workspace has no package manifest, rather than re-entering an ambient cached package.
