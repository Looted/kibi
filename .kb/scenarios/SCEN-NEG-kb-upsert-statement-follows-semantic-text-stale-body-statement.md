---
title: An upsert that changes semantic_text without a body does not leave the old statement in the document
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:30.229Z'
id: SCEN-NEG-kb-upsert-statement-follows-semantic-text-stale-body-statement
type: scenario
---
Given a requirement whose document body has a statement and a Context section, when kb_upsert changes its semantic_text without sending a document body, then the old statement is not kept: the body statement is replaced with the new text and the Context section is kept byte for byte.

This is the failure side of keeping the body in step with semantic_text: the checked meaning and the prose a reader sees must never drift apart. packages/cli/tests/operations/source-authoring.test.ts "a changed semantic_text replaces the body statement and keeps its context" exercises it.
