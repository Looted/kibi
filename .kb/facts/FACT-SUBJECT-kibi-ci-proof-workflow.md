---
title: Kibi strict requirement proof workflow
status: active
fact_kind: subject
subject_key: kibi.ci.proof_workflow
canonical_key: kibi_ci_proof_workflow
origin:
  kind: agent
  recorded_at: '2026-11-17T10:50:55.686Z'
id: FACT-SUBJECT-kibi-ci-proof-workflow
type: fact
---
The GitHub workflow (.github/workflows/proof.yml) that runs every proof contract of Kibi's own KB through kibi prove on pull requests and develop pushes, enforces evidence floors and publishes the requirement health report.