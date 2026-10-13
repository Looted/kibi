---
title: Bootstrap on a seeded knowledge base plans declared claims and names why others were not planned
status: active
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
origin:
  kind: agent
  recorded_at: '2026-10-13T16:36:29.069Z'
id: SCEN-bootstrap-seeded-claim-plan
type: scenario
---
Given a repository whose knowledge base is already seeded (at least one requirement, five non-symbol entities and one supporting entity), when the agent calls kb_plan_bootstrap with two authoritative knowledge sources and several cited intent claims, one of which is already a requirement in the knowledge base, then the plan holds a candidate for each new claim and no discovered candidates, the existing claim is counted as already in the KB, each source's accounting adds up to its declared claims, apply is not blocked, and applying the approved plan writes the new requirements.

Without declared claims the seeded plan stays a handoff whose message names kb_compile_intent. In a mode that plans no declared claims, each claim is kept as a suppressed_by_activation row and the accounting says the activation mode suppressed it.

This replaces the earlier seeded handoff, which planned nothing for declared claims and left the agent one compile and one write per claim.
