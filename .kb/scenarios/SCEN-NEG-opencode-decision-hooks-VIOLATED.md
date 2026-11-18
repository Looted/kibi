---
title: 'OpenCode goes unguarded: the plugin skips the decision guard'
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-17T19:03:55.177Z'
id: SCEN-NEG-opencode-decision-hooks-VIOLATED
type: scenario
---
An OpenCode session edits a firm rule's source and gets no firm-edit stop, rule note or capture request.

This is the failure side the OpenCode plugin must not produce; TEST-opencode-decision-hooks checks it.