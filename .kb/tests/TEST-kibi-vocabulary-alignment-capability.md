---
title: Vocabulary-alignment protocol, providers, and host composition
status: passing
verification_scope: unit
tags:
  - vocabulary-convergence
id: TEST-kibi-vocabulary-alignment-capability
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
Provider clients are injected, so the test needs no network. Spies assert that `kb_check` never resolves a plugin.
