---
title: Session brief without the conflict rule
status: active
fact_kind: property_value
subject_key: kibi.session_brief
property_key: brief_treats_conflicting_request_as_question
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - session-brief
id: FACT-session-brief-conflict-rule-missing
type: fact
---
Scenario input: a session brief that does not say a request contradicting a recorded rule is a question, so the agent carries the request out as a task.