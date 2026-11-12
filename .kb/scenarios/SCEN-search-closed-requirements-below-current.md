---
title: A search over closed and current requirements leads with the current one
status: active
priority: must
tags:
  - search
  - hooks
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:39.237Z'
id: SCEN-search-closed-requirements-below-current
type: scenario
---
Given a closed requirement and a current one that match a query as well, when an agent runs kb_search, the current requirement ranks first and leads the answer's governing list; the closed requirement follows it with the reason `demoted: closed`, so an agent reads the current rule first without losing a closed rule that may still hold. A closed requirement that a current requirement supersedes is handled as superseded instead.