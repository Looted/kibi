---
title: A kb_record that differs from kb_upsert of its payload is refused
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T07:11:13.419Z'
id: SCEN-NEG-kb-record-upsert-equivalence-RESULTS-DIFFER
type: scenario
---
Given a knowledge base where kb_record writes an entity or reports a verdict that kb_upsert of its payload followed by kb_check changed:true does not, when the two are compared, then the kb_record is refused.
