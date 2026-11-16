---
title: The KB merge workflow runs the proof gate step before the push step
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: precedes
operator: includes
value_type: set
value_set:
  - check (sh scripts/proof-gate.sh) -> push of the merge
claim_key: CLAIM-8948B0F74FEC41BA
claim_text: The Kibi KB merge workflow must run the proof gate before pushing a merge
text_ref: REQ-ci-kb-merge-gate-order
origin:
  kind: agent
  recorded_at: '2026-10-28T09:39:40.684Z'
id: FACT-ci-kb-merge-gate-before-push
type: fact
---
The resolve job of .github/workflows/kb-merge.yml passes `sh scripts/proof-gate.sh` to the Kibi KB merge action as its check, and the action pushes a merge only after the check passed on the merged tree.