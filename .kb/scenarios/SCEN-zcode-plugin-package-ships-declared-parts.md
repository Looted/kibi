---
title: A copied kibi-zcode package ships every part it declares
status: active
expects: success
tags:
  - scenario
  - zcode
  - plugin
  - packaging
origin:
  kind: agent
  recorded_at: '2026-11-23T18:33:21.578Z'
id: SCEN-zcode-plugin-package-ships-declared-parts
type: scenario
---
**Given** the kibi-zcode package as a ZCode marketplace install copies it, **when** ZCode loads the plugin, **then** the manifest declares the skills, commands and mcpServers fields, the `kibi-bootstrap` command and the seven Kibi skills are present, the `kibi` MCP server runs only the bundled launcher, and the hooks register the SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop events.

`packages/cli/tests/proofs/claims/zcode-plugin-package.proof.test.ts` reads each of these files the way Kibi does.
