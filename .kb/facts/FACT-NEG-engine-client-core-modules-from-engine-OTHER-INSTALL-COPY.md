---
title: A client loads its own install's copy of a core module into a shared engine
status: active
fact_kind: property_value
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:24.121Z'
subject_key: kibi.engine.core_modules
property_key: client_loads_of_another_install_copy
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
id: FACT-NEG-engine-client-core-modules-from-engine-OTHER-INSTALL-COPY
type: fact
---
A client of a second install of the same release asks the engine to load its own copy of discovery.pl, which the engine already loaded from its own core, so SWI-Prolog refuses with permission_error(redefine, module, discovery).