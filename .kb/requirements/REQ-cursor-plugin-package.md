---
title: The kibi-cursor package ships its manifest, skills, rules, commands, hooks and MCP launcher
status: open
semantic_text: The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories. The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields. The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules. The kibi-cursor plugin must ship a kibi-bootstrap command. The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder. The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks. The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:52:16.207Z'
firmness: firm
semantic_clauses:
  - The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories.
  - The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields.
  - The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills.
  - The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules.
  - The kibi-cursor plugin must ship a kibi-bootstrap command.
  - The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder.
  - The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks.
  - The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 504752b9a3126005e21e0c4ba1ce695a2288eadf4bd1e6b5f298241db47ce5de
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
  - claim_key: CLAIM-930C7BFCB5C43874
    claim_text: The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills
    role: normative
    status: modeled
    span:
      start: 266
      end: 412
  - claim_key: CLAIM-9B17D222A1E9E7D9
    claim_text: The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules
    role: normative
    status: modeled
    span:
      start: 414
      end: 492
  - claim_key: CLAIM-93D62596C7630D34
    claim_text: The kibi-cursor plugin must ship a kibi-bootstrap command
    role: normative
    status: modeled
    span:
      start: 494
      end: 551
  - claim_key: CLAIM-EC9C4089EB04AF7B
    claim_text: The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder
    role: normative
    status: modeled
    span:
      start: 553
      end: 670
  - claim_key: CLAIM-ABD22F4069E4DFBE
    claim_text: The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks
    role: normative
    status: modeled
    span:
      start: 672
      end: 814
  - claim_key: CLAIM-69509950E9E93838
    claim_text: The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies
    role: normative
    status: modeled
    span:
      start: 816
      end: 903
logic_claims:
  - CLAIM-59F0EF488D027724
  - CLAIM-F7A928E9B3D62DB3
  - CLAIM-930C7BFCB5C43874
  - CLAIM-9B17D222A1E9E7D9
  - CLAIM-93D62596C7630D34
  - CLAIM-EC9C4089EB04AF7B
  - CLAIM-ABD22F4069E4DFBE
  - CLAIM-69509950E9E93838
id: REQ-cursor-plugin-package
type: req
---
The kibi-cursor package must publish its .cursor-plugin manifest directory, its mcp.json configuration and its bin, hooks, skills, rules and commands directories. The kibi-cursor plugin manifest must declare the skills, rules, commands, hooks and mcpServers fields. The kibi-cursor plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-traceability and kibi-usage skills. The kibi-cursor plugin must ship the kibi-traceability and kibi-workflow rules. The kibi-cursor plugin must ship a kibi-bootstrap command. The kibi MCP server in the kibi-cursor MCP configuration must run only the bundled launcher with the workspace folder. The kibi-cursor hooks configuration must register the sessionStart, beforeSubmitPrompt, preToolUse, postToolUse, beforeReadFile and stop hooks. The kibi-cursor package must declare exactly kibi-cli and kibi-mcp as peer dependencies.

## Context

Cursor reads a plugin from .cursor-plugin/plugin.json, which points at the skills, rules, commands, hooks and MCP configuration. These claims pin what the published kibi-cursor package contains, so each one is proved by reading the package files. The adapter's runtime behaviour is stated in REQ-cursor-kibi-plugin-v1.
