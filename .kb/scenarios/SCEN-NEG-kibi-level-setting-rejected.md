---
title: A level setting that names no level is reported and read as test
status: active
expects: rejection
text_ref: packages/agent-core/src/kibi-level.ts
tags:
  - negative-path
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:03.389Z'
id: SCEN-NEG-kibi-level-setting-rejected
type: scenario
---
Given kibi.level set to a value that is not remember or test, kibi check reports a configuration warning naming the setting, and Kibi runs at test.
