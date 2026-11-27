---
title: A whole-file read of a busy file names its requirement ids on one line
status: active
expects: success
priority: must
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  recorded_at: '2026-11-25T14:29:16.890Z'
id: SCEN-hook-busy-file-ids
type: scenario
---
Given a file that implements more than 5 requirements, when the agent reads it whole, then the hook names their ids on one line without titles.
