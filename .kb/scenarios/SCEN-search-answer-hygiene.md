---
title: An agent reads a search answer and a check result without being misled by what they omit
status: active
tags:
  - search
  - checks
  - search-lane
priority: must
origin:
  kind: agent
  recorded_at: '2026-10-11T19:53:45.241Z'
id: SCEN-search-answer-hygiene
type: scenario
---
# An agent reads a search answer and a check result without being misled by what they omit

Given a KB where a role fact is linked to no requirement, a requirement is specified by a scenario with the same wording, and a symbol in a changed file implements a requirement whose wording shares nothing with the agent's question
When the agent searches for the role fact
Then the fact is the top match, the answer's `ungoverned` list names it with rank 1 and its typed claim, and the note says the governing requirements were reached through lower-ranked matches
When the agent searches for the requirement's wording
Then the requirement and its scenario tie at the top, `topRivalMargin` is null and `ambiguous` is false, while a second unlinked requirement with the same wording makes the answer ambiguous
When the agent searches with the changed file's symbol as a source location
Then the implemented requirement is returned with the reason `implemented at the source location` and a `sourceMatches` row naming the symbol, and nothing else from the file's neighbourhood is
When the agent runs kb_check with `domain-contradictions` on an empty KB and then on two requirements constraining the same subject
Then the result reports `evaluated.rules` and `factPairsExamined` 0 and 1 respectively, a check that did not select the rule reports no pair count, and kb_search with `limit: 1` reports `returned: 1` next to the ranking's `count`