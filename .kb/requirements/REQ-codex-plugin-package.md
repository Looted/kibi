---
title: The kibi-codex package ships its manifest, skills, hooks and peer dependencies
status: open
semantic_text: The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:48:33.278Z'
firmness: firm
semantic_clauses:
  - The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories.
  - The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields.
  - The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
  - The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 77a9f9aedb399d1b2afc3f32f7ba01e38ba74e7015d4edb9b360fd1328d0829c
semantic_inventory:
  - claim_key: CLAIM-E17040C703A7CF28
    claim_text: The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories
    role: normative
    status: modeled
    span:
      start: 0
      end: 143
  - claim_key: CLAIM-AEF7587DBC190FD1
    claim_text: The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 145
      end: 228
  - claim_key: CLAIM-3C03F93E59BE963F
    claim_text: The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 230
      end: 410
  - claim_key: CLAIM-EEAA3048360DABE2
    claim_text: The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 412
      end: 545
  - claim_key: CLAIM-2F06E07396A59AF2
    claim_text: The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies
    role: normative
    status: modeled
    span:
      start: 547
      end: 633
logic_claims:
  - CLAIM-E17040C703A7CF28
  - CLAIM-AEF7587DBC190FD1
  - CLAIM-3C03F93E59BE963F
  - CLAIM-EEAA3048360DABE2
  - CLAIM-2F06E07396A59AF2
id: REQ-codex-plugin-package
type: req
---
The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.

## Context

Codex reads a plugin from .codex-plugin/plugin.json, which points at the skills directory, the hooks configuration and the MCP configuration. These claims pin what the published kibi-codex package contains, so each one is proved by reading the package files. The adapter's runtime behaviour is stated in REQ-codex-hook-limits.
