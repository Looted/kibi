---
title: The KB merge workflow pushes the merge before it runs the proof gate
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: precedes
operator: eq
value_type: set
value_set:
  - git push origin "HEAD:refs/heads/$KIBI_BRANCH" -> sh scripts/proof-gate.sh
origin:
  kind: agent
  recorded_at: '2026-10-29T22:10:28.544Z'
id: FACT-NEG-ci-kb-merge-gate-order-PUSH-BEFORE-GATE
type: fact
---
