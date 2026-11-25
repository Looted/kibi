---
title: Unscoped and distant decisions stay candidates
status: active
priority: must
expects: success
tags:
  - search
  - retrieval
origin:
  kind: agent
  recorded_at: '2026-11-25T14:30:35.624Z'
id: SCEN-search-scope-tiers-stay-candidates
type: scenario
---
A question matches an unscoped decision, a distant decision and a decision in another scope as strongly as an in-scope one; the unscoped and distant decisions are still ranked, below the in-scope one, and the decision in another scope is only counted with its id.