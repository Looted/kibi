---
firmness: default
origin:
  kind: agent
  approved_by: Piotr Franczyk
  ref: 'Maintainer decision, 2026-11-24, on the shipped-parts case: "Remodel the fact instead" (list every packaged file and pin package.json files).'
  recorded_at: '2026-11-24T07:45:54.325Z'
priority: must
status: open
tags:
  - antigravity
  - plugin
  - skills
title: The kibi-antigravity package ships exactly its plugin parts and seven skills
rationale: Antigravity discovers a native plugin's manifest, lifecycle hooks, MCP server config, rules, and skills from fixed plugin-root paths and validates them with agy plugin validate --strict.
semantic_text: The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules, skills, assets, dist build output, self-contained bin scripts, README.md, CHANGELOG.md, LICENSE and SECURITY.md, and no other files. The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a1b4e43274ea413d3d349c7e1d3d7efde29e4afb2f7e08f5adca9b272f3f1503
semantic_inventory:
  - claim_key: CLAIM-35D0A196585C24D0
    claim_text: The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules, skills, assets, dist build output, self-contained bin scripts, README.md, CHANGELOG.md, LICENSE and SECURITY.md, and no other files
    role: normative
    status: modeled
    span:
      start: 0
      end: 292
  - claim_key: CLAIM-04AD5F15DC53AF27
    claim_text: The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 294
      end: 480
    subjects:
      - antigravity.kibi_plugin
logic_claims:
  - CLAIM-35D0A196585C24D0
  - CLAIM-04AD5F15DC53AF27
id: REQ-antigravity-plugin-package
type: req
required_evidence: tested
---
The kibi-antigravity package must ship its root plugin.json manifest, hooks.json lifecycle hooks configuration, mcp_config.json MCP server configuration, rules, skills, assets, dist build output, self-contained bin scripts, README.md, CHANGELOG.md, LICENSE and SECURITY.md, and no other files. The kibi-antigravity plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.

## Context

Antigravity discovers a native plugin's manifest, lifecycle hooks, MCP server config, rules, and skills from fixed plugin-root paths and validates them with agy plugin validate --strict.

## Source

> Maintainer decision, 2026-11-24, on the shipped-parts case: "Remodel the fact instead" (list every packaged file and pin package.json files).
