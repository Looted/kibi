---
title: Fresh init creates canonical .kb/ layout without config.json
status: active
tags:
  - cli
  - init
  - canonical-layout
id: SCEN-cli-canonical-init
type: scenario
---
Given a fresh Git repository
When the operator runs `kibi init`
Then `.kb/manifest.json` and the canonical knowledge lanes exist
And `.kb/config.json` is not created
And derived `.kb/branches`, `.kb/recovery`, `.kb/verification`, and `.kb/briefs` are gitignored
