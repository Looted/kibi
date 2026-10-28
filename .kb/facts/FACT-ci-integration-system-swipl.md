---
title: The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system
status: active
fact_kind: property_value
subject_key: kibi.ci.integration_job
claim_key: CLAIM-DF4E3136C1465174
claim_text: The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system
text_ref: REQ-prolog-ci-system-swipl-job
property_key: kibi_swipl
operator: eq
value_type: set
value_set:
  - system
origin:
  kind: agent
  recorded_at: '2026-10-28T10:37:05.953Z'
id: FACT-ci-integration-system-swipl
type: fact
---
REQ-prolog-bundled-ci says Kibi's own CI must keep one job that runs a system SWI-Prolog selected with KIBI_SWIPL=system. That job is ci-integration in .github/workflows/ci.yml, which sets KIBI_SWIPL to system for every step; this requirement states that setting so it is proved against the workflow file.