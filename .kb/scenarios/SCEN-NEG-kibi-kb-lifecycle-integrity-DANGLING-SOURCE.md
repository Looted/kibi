---
title: An authored source that resolves to nothing is reported as a source-path-dangling violation
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:53:33.489Z'
id: SCEN-NEG-kibi-kb-lifecycle-integrity-DANGLING-SOURCE
type: scenario
---
Given a schema 6 KB in which a fact carries an authored source that is not an existing workspace path, an entity id or an http(s) URL, and that migration cannot rewrite safely, when kb_check runs the source-path-dangling rule, then it reports the fact as a source-path-dangling violation and migration leaves the value as a review action instead of editing it.

This is the failure side of authored source resolution: a dead source must be refused rather than read as provenance. packages/cli/tests/commands/migrate-lifecycle.test.ts "plans and applies the lifecycle repairs on a schema 6 KB, leaving cycles and unsafe source edits for review" exercises it by checking FACT-upload-legacy after the repairs are applied.
