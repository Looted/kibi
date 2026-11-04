---
title: The kibi-zcode package ships its manifest, bootstrap command, skills and MCP launcher
status: open
semantic_text: The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields. The kibi-zcode plugin must ship a kibi-bootstrap command. The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher. The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:40:25.712Z'
firmness: firm
semantic_clauses:
  - The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields.
  - The kibi-zcode plugin must ship a kibi-bootstrap command.
  - The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher.
  - The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 68d84c3abd9b5006f3f07a96b47990e591ff7ed3824e2fb193b69970d9cce173
semantic_inventory:
  - claim_key: CLAIM-2C1636E502EB6164
    claim_text: The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 0
      end: 93
  - claim_key: CLAIM-57A92DF403F17ADF
    claim_text: The kibi-zcode plugin must ship a kibi-bootstrap command
    role: normative
    status: modeled
    span:
      start: 95
      end: 151
  - claim_key: CLAIM-5982BDE99889016F
    claim_text: The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 153
      end: 333
  - claim_key: CLAIM-DA997A6FCF6F4FF1
    claim_text: The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher
    role: normative
    status: modeled
    span:
      start: 335
      end: 420
  - claim_key: CLAIM-AE2131CEB3BC5794
    claim_text: The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 422
      end: 555
logic_claims:
  - CLAIM-2C1636E502EB6164
  - CLAIM-57A92DF403F17ADF
  - CLAIM-5982BDE99889016F
  - CLAIM-DA997A6FCF6F4FF1
  - CLAIM-AE2131CEB3BC5794
id: REQ-zcode-plugin-package
type: req
---
The kibi-zcode plugin manifest must declare the skills, commands, hooks and mcpServers fields. The kibi-zcode plugin must ship a kibi-bootstrap command. The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher. The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.

## Context

These are the packaging parts of the ZCode Kibi plugin that ZCode reads when the plugin is installed and enabled. They were split out of REQ-zcode-kibi-plugin-v1 so that each can be proved against the files the package ships, while the runtime behaviour stays in that requirement and its end-to-end test.
