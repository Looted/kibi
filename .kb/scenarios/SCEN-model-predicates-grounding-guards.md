---
title: An agent models a claim the requirement already grounds, does not state, or that contradicts a stored decision
status: active
priority: must
tags:
  - modeling
  - mutation
  - search-lane
origin:
  kind: agent
  recorded_at: '2026-10-12T18:49:18.588Z'
id: SCEN-model-predicates-grounding-guards
type: scenario
---
On the decision-conflict fixture (a coach allow rule linked from one requirement, an ungrounded assigned-requests requirement and a two-clause requirement), an agent calls kb_model mode predicates for a reworded claim the requirement already grounds, for a deny claim neither requirement states, and for a clause the two-clause requirement does state, then writes a fact with kb_upsert. It expects keep_existing_grounding with the match by canonical_key, extend_requirement with no planned fact and the conflicting allow fact named, a ready plan whose requirement step keeps the stored claim manifest, and the derived claim key in the write response.