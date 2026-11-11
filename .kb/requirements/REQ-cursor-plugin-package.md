---
title: The kibi-cursor package ships its manifest, skills, rules, commands, hooks and MCP launcher
status: open
semantic_text: The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories. The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields. The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules. The kibi-cursor plugin must ship a kibi-bootstrap command. The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder. The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks. The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:52:16.207Z'
firmness: firm
semantic_clauses:
  - The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories.
  - The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields.
  - The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules.
  - The kibi-cursor plugin must ship a kibi-bootstrap command.
  - The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder.
  - The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks.
  - The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 5a2bcd51622ec2cd7e32246e6d9e091b3e49a792528296eb11b120e2ff030658
semantic_inventory:
  - claim_key: CLAIM-59F0EF488D027724
    claim_text: The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories
    role: normative
    status: modeled
    span:
      start: 0
      end: 161
  - claim_key: CLAIM-F7A928E9B3D62DB3
    claim_text: The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 163
      end: 264
  - claim_key: CLAIM-E0972AB25D5495E5
    claim_text: The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 266
      end: 447
  - claim_key: CLAIM-9B17D222A1E9E7D9
    claim_text: The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules
    role: normative
    status: modeled
    span:
      start: 449
      end: 527
  - claim_key: CLAIM-93D62596C7630D34
    claim_text: The kibi-cursor plugin must ship a kibi-bootstrap command
    role: normative
    status: modeled
    span:
      start: 529
      end: 586
  - claim_key: CLAIM-EC9C4089EB04AF7B
    claim_text: The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder
    role: normative
    status: modeled
    span:
      start: 588
      end: 705
  - claim_key: CLAIM-ABD22F4069E4DFBE
    claim_text: The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks
    role: normative
    status: modeled
    span:
      start: 707
      end: 849
  - claim_key: CLAIM-69509950E9E93838
    claim_text: The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies
    role: normative
    status: modeled
    span:
      start: 851
      end: 938
logic_claims:
  - CLAIM-59F0EF488D027724
  - CLAIM-F7A928E9B3D62DB3
  - CLAIM-E0972AB25D5495E5
  - CLAIM-9B17D222A1E9E7D9
  - CLAIM-93D62596C7630D34
  - CLAIM-EC9C4089EB04AF7B
  - CLAIM-ABD22F4069E4DFBE
  - CLAIM-69509950E9E93838
id: REQ-cursor-plugin-package
type: req
---
The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories. The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields. The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules. The kibi-cursor plugin must ship a kibi-bootstrap command. The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder. The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks. The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.

## Context

Cursor reads a plugin from .cursor-plugin/plugin.json, which points at the skills, rules, commands, hooks and MCP configuration. These claims pin what the published kibi-cursor package contains, so each one is proved by reading the package files. The adapter's runtime behaviour is stated in REQ-cursor-hook-limits.
