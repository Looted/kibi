---
firmness: default
origin:
  approved_by: maintainer
  kind: agent
  recorded_at: '2026-11-23T06:15:17Z'
  ref: 'Maintainer decision, 2026-11-23, approving the Antigravity plugin requirements signoff: "All approved."'
priority: must
status: open
tags:
  - antigravity
  - plugin
  - skills
title: The kibi-antigravity package ships its root manifest, hooks, MCP config, rules, bin scripts and seven skills
rationale: Antigravity discovers a native plugin's manifest, lifecycle hooks, MCP server config, rules, and skills from fixed plugin-root paths and validates them with agy plugin validate --strict.
semantic_text: The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules/AGENTS.md, and self-contained bin scripts. The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 76fb57100092ca25a95e51336f22d8fdd4140e9feb09efd61cee54ae840f0012
semantic_inventory:
  - claim_key: CLAIM-EF37722DCB8CDA3D
    claim_text: The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules/AGENTS.md, and self-contained bin scripts
    role: normative
    status: modeled
    span:
      start: 0
      end: 201
    subjects:
      - antigravity.kibi_plugin
  - claim_key: CLAIM-04AD5F15DC53AF27
    claim_text: The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 203
      end: 389
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-EF37722DCB8CDA3D
  - CLAIM-04AD5F15DC53AF27
id: REQ-antigravity-plugin-package
type: req
---
The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules/AGENTS.md, and self-contained bin scripts. The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.

## Context

Antigravity discovers a native plugin's manifest, lifecycle hooks, MCP server config, rules, and skills from fixed plugin-root paths and validates them with agy plugin validate --strict.
