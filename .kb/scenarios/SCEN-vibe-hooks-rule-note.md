---
title: Vibe adds the rule note for a prompt that states a rule
status: active
expects: success
tags:
  - vibe
priority: should
origin:
  kind: agent
  recorded_at: '2026-11-22T18:36:03.943Z'
id: SCEN-vibe-hooks-rule-note
type: scenario
---
Given a Kibi workspace, when the Vibe pre_agent hook gets "Invoices must never be deleted, because auditors need the full history.", its context carries the rule note once, with the stated reason; a prompt that states no rule gets no rule note.