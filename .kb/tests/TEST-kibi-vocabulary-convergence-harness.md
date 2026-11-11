---
title: Paraphrase-corpus convergence harness
status: passing
verification_scope: integration
tags:
  - vocabulary-convergence
id: TEST-kibi-vocabulary-convergence-harness
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This measures convergence on a paraphrase corpus (unit variants, subject-key variants, true restatements, near misses), so a later provider can be compared against the built-in's 0.571. It runs in CI-safe mode, and `KIBI_CONVERGENCE_REPORT` writes the JSON report.
