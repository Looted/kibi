---
title: The kibi-codex package ships its manifest, skills, hooks and peer dependencies
status: open
semantic_text: The kibi-codex package must publish its plugin.json manifest, its assets, .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the hooks, interface and mcpServers fields under extensions["com.openai"]. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
semantic_source_field: semantic_text
origin:
  kind: human
  ref: 'Maintainer decision, 2026-11-25, approving migration of kibi-codex to root plugin.json with extensions["com.openai"] and bundled icon assets: "with cleaner forward looking solution. If Codex suggests migrating, then we should."'
  approved_by: maintainer
  recorded_at: '2026-11-25T11:41:11.624Z'
firmness: firm
semantic_clauses:
  - The kibi-codex package must publish its plugin.json manifest, its assets, .mcp.json configuration and its bin, hooks and skills directories.
  - The kibi-codex plugin manifest must declare the hooks, interface and mcpServers fields under extensions["com.openai"].
  - The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
  - The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 8fb020c46621f1a4f81a42bb04bd56ec86781f3094d12a1f950be89070fd7876
semantic_inventory:
  - claim_key: CLAIM-A803F27577B74ED2
    claim_text: The kibi-codex package must publish its plugin.json manifest, its assets, .mcp.json configuration and its bin, hooks and skills directories
    role: normative
    status: modeled
    span:
      start: 0
      end: 139
  - claim_key: CLAIM-FE9E314873A11112
    claim_text: The kibi-codex plugin manifest must declare the hooks, interface and mcpServers fields under extensions["com.openai"]
    role: normative
    status: modeled
    span:
      start: 141
      end: 258
  - claim_key: CLAIM-3C03F93E59BE963F
    claim_text: The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 260
      end: 440
  - claim_key: CLAIM-EEAA3048360DABE2
    claim_text: The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 442
      end: 575
  - claim_key: CLAIM-2F06E07396A59AF2
    claim_text: The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies
    role: normative
    status: modeled
    span:
      start: 577
      end: 663
logic_claims:
  - CLAIM-A803F27577B74ED2
  - CLAIM-FE9E314873A11112
  - CLAIM-3C03F93E59BE963F
  - CLAIM-EEAA3048360DABE2
  - CLAIM-2F06E07396A59AF2
id: REQ-codex-plugin-package
type: req
rationale: Migrated kibi-codex from legacy .codex-plugin/plugin.json to root plugin.json (Agent Plugins 1.0 with extensions["com.openai"]) and bundled Kibi icon assets under assets/, per maintainer decision on 2026-11-25.
---
The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.

## Context

Codex reads a plugin from .codex-plugin/plugin.json, which points at the skills directory, the hooks configuration and the MCP configuration. These claims pin what the published kibi-codex package contains, so each one is proved by reading the package files. The adapter's runtime behaviour is stated in REQ-codex-hook-limits.

## Source

> Maintainer decision, 2026-11-25, approving migration of kibi-codex to root plugin.json with extensions["com.openai"] and bundled icon assets: "with cleaner forward looking solution. If Codex suggests migrating, then we should."
