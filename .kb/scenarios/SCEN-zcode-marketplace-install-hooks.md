---
status: active
tags:
  - scenario
  - zcode
  - plugin
  - marketplace
title: A marketplace install that copies the repository without building starts every kibi-zcode hook
origin:
  kind: agent
  recorded_at: '2026-11-20T15:22:57.460Z'
id: SCEN-zcode-marketplace-install-hooks
type: scenario
---
**Given** the kibi-zcode plugin source as a marketplace sees it — the repository's tracked files, with no build output, **when** ZCode installs the plugin by copying that source, **then** every lifecycle hook command in `hooks/hooks.json` resolves to a file inside the copied install (`bin/hook-runner.mjs`), and the hook runner starts under node and answers a hook event.
