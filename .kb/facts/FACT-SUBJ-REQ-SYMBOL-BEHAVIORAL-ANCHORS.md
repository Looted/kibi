---
title: Symbol traceability prefers behavioral anchors
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.symbols.traceability
canonical_key: req.req_symbol_behavioral_anchors
id: FACT-SUBJ-REQ-SYMBOL-BEHAVIORAL-ANCHORS
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Requirement-to-symbol traceability in Kibi: links should land on the behavioral code that decides the requirement, coarse file or module links are rejected where narrower symbols exist, and type-shape symbols alone do not count. It is the linking policy, not the symbol extractors.
