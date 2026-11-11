---
title: The kibi-claude package ships its manifest, skills, MCP launcher and lifecycle hooks
status: open
semantic_text: The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher. The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
semantic_source_field: semantic_text
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-10-27T07:43:12.862Z'
firmness: firm
semantic_clauses:
  - The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories.
  - The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher.
  - The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
priority: must
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_hash: 5d1ec629f3357cccead98c0c638d8602234b9606ecae955f3fd176a2fae47080
semantic_inventory:
  - claim_key: CLAIM-C3823F88987EFA0A
    claim_text: The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories
    role: normative
    status: modeled
    span:
      start: 0
      end: 145
  - claim_key: CLAIM-356FB1F64A34B134
    claim_text: The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 147
      end: 328
  - claim_key: CLAIM-4E46CD7CA044ACA0
    claim_text: The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher
    role: normative
    status: modeled
    span:
      start: 330
      end: 425
  - claim_key: CLAIM-CBAE2462F2FAD2EE
    claim_text: The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 427
      end: 561
logic_claims:
  - CLAIM-C3823F88987EFA0A
  - CLAIM-356FB1F64A34B134
  - CLAIM-4E46CD7CA044ACA0
  - CLAIM-CBAE2462F2FAD2EE
id: REQ-claude-plugin-package
type: req
---
The kibi-claude package must publish its .claude-plugin manifest directory, its .mcp.json configuration and its bin, hooks and skills directories. The kibi-claude plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-claude MCP configuration must run only the bundled MCP launcher. The kibi-claude hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.

## Context

Claude Code finds a plugin's parts by convention: the manifest in .claude-plugin/plugin.json, skills under skills/, hooks in hooks/hooks.json and MCP servers in .mcp.json. These claims pin what the published kibi-claude package contains, so each one is proved by reading the package files. The launcher resolves the project-local kibi-mcp and serves no tools in a workspace without .kb/manifest.json; that behaviour is stated in REQ-claude-unowned-project-silence.
