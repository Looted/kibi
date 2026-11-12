---
title: Resolver selects environment, bundled, then PATH SWI-Prolog and explains failures
status: active
tags:
  - prolog
  - bundle
id: SCEN-prolog-bundled-runtime
type: scenario
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 4): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This covers the lookup order PR 299 chose: environment variable, then bundle, then PATH. It also covers two of PR 299's own decisions: a damaged bundle is a hard error rather than a silent fallback, and `KIBI_SWIPL` never falls through.
