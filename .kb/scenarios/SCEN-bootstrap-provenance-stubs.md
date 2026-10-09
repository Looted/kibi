---
title: A provider candidate without a claim becomes a provenance stub that ranks last and is not counted
status: active
tags:
  - bootstrap
  - provenance-stubs
  - search
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: onboarding evaluation round 9 finding K18'
  recorded_at: '2026-10-09T07:20:33.683Z'
id: SCEN-bootstrap-provenance-stubs
type: scenario
---
Given a bootstrap scan whose source_symbols, repo_layout, repo_metadata or framework-less test_topology provider found a file but states no claim about it, when the plan is generated, then that candidate is a meta fact tagged bootstrap:provenance-stub, it is selected only after every discovered candidate with a claim, the plan summary reports provenanceStubs separately from candidatesWithClaims, and the over_limit diagnostic says how many suppressed rows are stubs; a test_topology candidate with a recognized framework keeps its claim and stays an observation. Given such a stub in the KB, when kb_search runs, then the stub sorts after every non-stub match with the reason demoted: provenance stub and the answer layer never lists it as a note; when kb_find_gaps or type coverage runs, then the stub is not counted as a fact; kb_query still returns it.