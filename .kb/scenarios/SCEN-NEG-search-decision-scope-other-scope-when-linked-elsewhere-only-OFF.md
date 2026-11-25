---
title: A decision linked only to missing files stays in scope (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:08.467Z'
id: SCEN-NEG-search-decision-scope-other-scope-when-linked-elsewhere-only-OFF
type: scenario
---
Given a decision linked only to files that do not exist in this workspace, when search places it in this workspace's scope, then it is refused.