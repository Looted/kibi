---
title: A lookup by file returns the requirements its symbols implement (refused when broken)
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T20:01:03.564Z'
id: SCEN-NEG-kb-query-source-file-requirements-LOOKUP
type: scenario
---
Given a file whose symbols implement a requirement, when a lookup by that file returns no requirement, then it is refused.
