---
title: A search result the answer quotes carries only its identity, score and reasons
status: active
tags:
  - search
  - cost
origin:
  kind: agent
  recorded_at: '2026-11-24T19:19:32.254Z'
id: SCEN-kb-search-answered-results-identity-only
type: scenario
---
Given a kb_search whose answer quotes a governing requirement's whole statement and a fact's claim, and whose results also hold a requirement with a clipped statement and an unlinked entity, when the search runs with the default summary fields, then the quoted requirement and fact come back with only their id, type, title, score and reasons, the others keep their snippet and evidence, and fields "full" returns every result whole.
