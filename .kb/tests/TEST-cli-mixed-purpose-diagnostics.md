---
id: TEST-cli-mixed-purpose-diagnostics
title: CLI mixed-purpose symbol diagnostic tests
status: passing
source: packages/cli/tests/traceability/impact-symbol-mixed-purpose.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
type: test
---

Validates language-agnostic mixed-purpose class/component/service symbol review diagnostics.

## Context
This checks the mixed-purpose class and component advisory in a language-agnostic way, as the quality-diagnostic changeset describes.
