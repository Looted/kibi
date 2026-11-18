---
title: Kibi CI proof reuse wait
status: active
fact_kind: subject
subject_key: kibi.ci.proof_reuse_wait
canonical_key: kibi_ci_proof_reuse_wait
origin:
  kind: agent
  recorded_at: '2026-11-17T10:50:54.069Z'
id: FACT-SUBJECT-kibi-ci-proof-reuse-wait
type: fact
---
The step of Kibi's proof workflow that, on a pull request, decides whether to wait for develop's own proof run of the base so it can reuse that proof, or to run the full proof at once.