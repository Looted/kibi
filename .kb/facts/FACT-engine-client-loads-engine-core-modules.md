---
title: A Kibi client must load Prolog core modules from the core the engine it talks to already runs
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:23.346Z'
subject_key: kibi.engine.core_modules
property_key: client_loads_of_another_install_copy
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-F57649C5EF6C2129
claim_text: A Kibi client must load Prolog core modules from the core the engine it talks to already runs, so a client from another install of the same release never fails because a core module is already loaded from a different file
text_ref: REQ-engine-client-core-modules-from-engine
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-engine-client-core-modules-from-engine
id: FACT-engine-client-loads-engine-core-modules
type: fact
---
Counts the core-module loads a client asks for that would load its own install's copy into an engine running another copy; zero means every load resolves next to the engine's own kb.pl.