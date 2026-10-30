---
title: A migration preview over drifted semantic_text is blocked as semantic source drift
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:54:10.121Z'
id: SCEN-NEG-kibi-legacy-migration-preview-v2-SEMANTIC-DRIFT
type: scenario
---
Given a legacy requirement whose stored semantic_text no longer matches the normalized authored Markdown it was taken from, when requirement coverage builds the legacy migration preview, then the batch is blocked with a source binding conflict, no property patch preview is offered, and the diagnostic names the differing semantic_text.

This is the failure side of the semantic source binding: a preview must never overwrite or silently reuse prose that has drifted from its source. packages/cli/tests/operations/legacy-migration-plan.test.ts "blocks semantic_text drift from the current authored Markdown" exercises it.
