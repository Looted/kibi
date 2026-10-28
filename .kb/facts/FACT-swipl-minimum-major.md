---
title: The minimum SWI-Prolog major version shall be 9
status: active
fact_kind: property_value
subject_key: kibi.prolog.swipl_version
claim_key: CLAIM-FFF27D6BB2C61251
claim_text: The minimum SWI-Prolog major version shall be 9
text_ref: REQ-prolog-swipl-minimum-version
property_key: minimum_swipl_major
operator: eq
value_type: int
value_int: 9
origin:
  kind: agent
  recorded_at: '2026-10-28T10:35:12.962Z'
id: FACT-swipl-minimum-major
type: fact
---
MINIMUM_SWIPL_MAJOR in packages/cli/src/prolog/swipl-resolver.ts is the version floor REQ-prolog-bundled-runtime applies when it rejects a swipl on PATH older than 9.0. It is stated here as a number so it is proved against the constant; the resolution order stays in REQ-prolog-bundled-runtime.