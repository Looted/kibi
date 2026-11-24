---
title: The kibi-zcode package ships its manifest, bootstrap command, skills and MCP launcher
status: open
firmness: firm
required_evidence: tested
priority: must
tags:
  - kibi
  - zcode
  - plugin
  - mcp
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-23, approving the implementation plan for #852: "hooks key: remove it from the manifest and supersede REQ-zcode-plugin-package with a version whose manifest sentence names skills, commands and mcpServers." Appended 2026-11-24: maintainer signoff on the requirements signoff view of PR #853, asked as "Do you approve requirements 1 and 2 as recorded, including the retirement of REQ-zcode-plugin-package?", answered "Signed off".'
  approved_by: maintainer
  recorded_at: '2026-11-24T07:50:54Z'
semantic_text: The kibi-zcode plugin manifest must declare the skills, commands and mcpServers fields. The kibi-zcode plugin must ship a kibi-bootstrap command. The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher. The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
semantic_clauses:
  - The kibi-zcode plugin manifest must declare the skills, commands and mcpServers fields.
  - The kibi-zcode plugin must ship a kibi-bootstrap command.
  - The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others.
  - The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher.
  - The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cae0ee23560dc6b0025bf8ba490806fbafd1f5c6fbda6ed0859c549428301028
semantic_inventory:
  - claim_key: CLAIM-60DC86D3C7A20F0D
    claim_text: The kibi-zcode plugin manifest must declare the skills, commands and mcpServers fields
    role: normative
    status: modeled
    span:
      start: 0
      end: 86
    subjects:
      - zcode.kibi_adapter
  - claim_key: CLAIM-57A92DF403F17ADF
    claim_text: The kibi-zcode plugin must ship a kibi-bootstrap command
    role: normative
    status: modeled
    span:
      start: 88
      end: 144
    subjects:
      - zcode.kibi_adapter
  - claim_key: CLAIM-5982BDE99889016F
    claim_text: The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others
    role: normative
    status: modeled
    span:
      start: 146
      end: 326
    subjects:
      - zcode.kibi_adapter
  - claim_key: CLAIM-DA997A6FCF6F4FF1
    claim_text: The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher
    role: normative
    status: modeled
    span:
      start: 328
      end: 413
    subjects:
      - zcode.kibi_adapter
  - claim_key: CLAIM-AE2131CEB3BC5794
    claim_text: The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks
    role: normative
    status: modeled
    span:
      start: 415
      end: 548
    subjects:
      - zcode.kibi_adapter
logic_claims:
  - CLAIM-60DC86D3C7A20F0D
  - CLAIM-57A92DF403F17ADF
  - CLAIM-5982BDE99889016F
  - CLAIM-DA997A6FCF6F4FF1
  - CLAIM-AE2131CEB3BC5794
rationale: 'Maintainer decision, 2026-11-23, approving the implementation plan for #852: remove the hooks key from the manifest. ZCode reads that field as the path of a hooks file and reported `plugin_hook_read_failed` on every start, while the hooks load from the conventional `hooks/hooks.json`.'
id: REQ-zcode-plugin-package-v2
type: req
---
The kibi-zcode plugin manifest must declare the skills, commands and mcpServers fields. The kibi-zcode plugin must ship a kibi-bootstrap command. The kibi-zcode plugin must bundle the kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage skills, and no others. The kibi MCP server in the kibi-zcode manifest must run only the bundled MCP launcher. The kibi-zcode hooks configuration must register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop lifecycle hooks.

## Context

Maintainer decision, 2026-11-23, approving the implementation plan for #852: remove the hooks key from the manifest. ZCode reads that field as the path of a hooks file and reported `plugin_hook_read_failed` on every start, while the hooks load from the conventional `hooks/hooks.json`.

## Why this changed

Supersedes REQ-zcode-plugin-package. Its first sentence also asked the manifest to declare a `hooks` field. ZCode reads that field as the path of a hooks file and raised `plugin_hook_read_failed` on every start, because the plugin named the `hooks` directory there; the hooks load from the conventional `hooks/hooks.json` without it. The other four sentences are unchanged and keep their facts and proofs.

## Source

> Maintainer decision, 2026-11-23, approving the implementation plan for #852: "hooks key: remove it from the manifest and supersede REQ-zcode-plugin-package with a version whose manifest sentence names skills, commands and mcpServers." Appended 2026-11-24: maintainer signoff on the requirements signoff view of PR #853, asked as "Do you approve requirements 1 and 2 as recorded, including the retirement of REQ-zcode-plugin-package?", answered "Signed off".
