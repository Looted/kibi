---
title: A search answer says what the checks report about each governing requirement and which snapshot it came from
status: active
priority: must
tags:
  - search
  - answer-layer
  - discovery
  - verdicts
  - exceptions
origin:
  kind: agent
  recorded_at: '2026-10-04T02:34:50.095Z'
id: SCEN-kibi-search-answer-verdicts
type: scenario
---
# A search answer says what the checks report about each governing requirement and which snapshot it came from

Given a governing requirement that a domain contradiction or an infeasible scenario names
When an agent asks `kb_search` a question that matches it
Then the answer gives the requirement a `contradiction` or `infeasible` verdict with the witnesses that name it.

Given a governing requirement with an approved exception and a clause the checks could not ground
When the agent asks the same question
Then the answer lists the exception with its approver and the ungrounded clause under `unknowns`, and the verdict is `unknown` only when nothing stronger applies.

Given a governing requirement no check names
When the agent asks about it
Then its verdict is `none` and the answer still says that a `none` verdict and graph links are not proof.

Given any answer
Then its `scope` names the branch, the snapshot id and the sync time, and an answer over the byte ceiling drops ADR excerpts before any governing requirement.
