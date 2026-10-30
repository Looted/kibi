---
title: A legacy migration preview batch that is not a read-only reviewed patch fails the preview guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:56.750Z'
id: SCEN-CASE-kibi-legacy-migration-preview-v2-writable-batch
type: scenario
---
Given two legacy requirements selected for migration preview, when the preview is built, then the plan is read-only, the batch is not auto-applicable, every proposition requires review, the application policy is preview-only with sequential upserts, and the patch holds only the reviewed semantic_text property fields, so a writable or auto-applicable batch fails the guard.

The test case packages/cli/tests/operations/legacy-migration-plan.test.ts "returns one deterministic source-bound review batch by default" exercises it. It covers the value past the bound of preview batches that are not a read-only reviewed patch, `gt 0`.