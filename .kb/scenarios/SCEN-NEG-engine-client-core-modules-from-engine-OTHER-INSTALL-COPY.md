---
title: A client that loads its own copy of a core module into a shared engine is refused
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T09:59:25.650Z'
id: SCEN-NEG-engine-client-core-modules-from-engine-OTHER-INSTALL-COPY
type: scenario
---
Given an engine that loaded kb.pl and discovery.pl from one copy of the core, when a client asks it to load discovery.pl from another copy by absolute path, then SWI-Prolog refuses with permission_error(redefine, module, discovery) and the request fails.

This is the failure side of module loading: packages/cli/tests/prolog/core-module-goal.test.ts shows the plain load is refused while the goal clients now send loads the engine's own copy.