---
title: The KB merge workflow runs the proof gate step before the push step
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_workflow
property_key: precedes
operator: includes
value_type: set
value_set:
  - sh scripts/proof-gate.sh -> git push origin "HEAD:refs/heads/$KIBI_BRANCH"
claim_key: CLAIM-8948B0F74FEC41BA
claim_text: The Kibi KB merge workflow must run the proof gate before pushing a merge
text_ref: REQ-ci-kb-merge-gate-order
origin:
  kind: agent
  recorded_at: '2026-10-28T09:39:40.684Z'
id: FACT-ci-kb-merge-gate-before-push
type: fact
---
The resolve job of .github/workflows/kb-merge.yml runs its steps in order and stops at the first failure, so the proof gate step must come before the step that pushes the merge.