---
title: The kibi-codex package ships its manifest, skills, hooks and peer dependencies
status: open
semantic_text: The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:48:33.278Z'
firmness: firm
semantic_clauses:
  - The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories.
  - The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields.
  - The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills.
  - The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
  - The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: deae2a3cab77408d2dd67a489367f80c0b61bfc2feb4492bf98e10fc0311070f
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
  - claim_key: CLAIM-D7E2340FFABCF26E
    claim_text: The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills
    role: normative
    status: modeled
    span:
      start: 230
      end: 375
  - claim_key: CLAIM-EEAA3048360DABE2
    claim_text: The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 377
      end: 510
  - claim_key: CLAIM-2F06E07396A59AF2
    claim_text: The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies
    role: normative
    status: modeled
    span:
      start: 512
      end: 598
logic_claims:
  - CLAIM-E17040C703A7CF28
  - CLAIM-AEF7587DBC190FD1
  - CLAIM-D7E2340FFABCF26E
  - CLAIM-EEAA3048360DABE2
  - CLAIM-2F06E07396A59AF2
id: REQ-codex-plugin-package
type: req
---
The kibi-codex package must publish its .codex-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-codex plugin manifest must declare the skills, hooks and mcpServers fields. The kibi-codex plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. The kibi-codex hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks. The kibi-codex package must declare exactly kibi-cli and kibi-mcp as peer dependencies.

## Context

Codex reads a plugin from .codex-plugin/plugin.json, which points at the skills directory, the hooks configuration and the MCP configuration. These claims pin what the published kibi-codex package contains, so each one is proved by reading the package files. The adapter's runtime behaviour is stated in REQ-codex-kibi-plugin-v1.
