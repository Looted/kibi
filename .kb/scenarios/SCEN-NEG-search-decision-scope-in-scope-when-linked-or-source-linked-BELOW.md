---
title: One linked decision puts its whole source in scope (refused)
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-25T14:35:01.145Z'
id: SCEN-NEG-search-decision-scope-in-scope-when-linked-or-source-linked-BELOW
type: scenario
---
Given a knowledge source with only one decision linked to a file here, when search places that source's unlinked decisions in this workspace's scope, then it is refused.