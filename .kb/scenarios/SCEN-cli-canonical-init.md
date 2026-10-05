---
title: Fresh init creates canonical .kb/ layout without config.json
status: active
tags:
  - cli
  - init
  - canonical-layout
id: SCEN-cli-canonical-init
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Given a fresh Git repository
When the operator runs `kibi init`
Then `.kb/manifest.json` and the canonical knowledge lanes exist
And `.kb/config.json` is not created
And derived `.kb/branches`, `.kb/recovery`, `.kb/verification`, and `.kb/briefs` are gitignored
