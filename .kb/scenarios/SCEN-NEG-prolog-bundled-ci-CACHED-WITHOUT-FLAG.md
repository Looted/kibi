---
title: A cached SWI-Prolog archive from another run is refused unless the cached build is asked for
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:05:56.907Z'
id: SCEN-NEG-prolog-bundled-ci-CACHED-WITHOUT-FLAG
type: scenario
---
Given a SWI-Prolog archive built and bound to one commit and run, when a later run populates the platform package from it without asking for a cached build, then population is refused because the build provenance differs; only with the cached-build option is the archive accepted, and then only after its other checks pass.

This is the failure side of the cached CI archive: a run must not silently consume bytes another run produced unless it opts in. scripts/tests/populate-swipl-platform-packages.test.ts "a cached build is accepted across commits, but only when asked for and never past another check" exercises it.
