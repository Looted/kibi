---
title: A busy file's snippet names the requirements it cannot show
status: active
expects: success
priority: must
tags:
  - hooks
  - edit-snippets
origin:
  kind: agent
  recorded_at: '2026-11-24T20:02:10.139Z'
id: SCEN-edit-snippet-names-hidden-requirements
type: scenario
---
Given a file linked to more requirements than its snippet can show in full, when the snippet is built within its budget, then it lists the hidden requirement ids on an Also linked line with the kb_query call that lists them.
