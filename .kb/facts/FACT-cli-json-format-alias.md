---
title: kibi CLI --json with a non-json explicit --format is rejected with exit code 2
status: active
fact_kind: property_value
subject_key: kibi.cli.json_format_alias
property_key: conflicting_format_exit_code
operator: eq
value_type: int
value_int: 2
claim_key: CLAIM-24DAE4E956A9F09C
claim_text: On a kibi CLI command that accepts --format json, --json must select JSON output, and --json together with an explicitly passed --format of any other value must be rejected with exit code 2 before the command runs
text_ref: REQ-cli-json-format-alias
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-cli-json-format-alias
origin:
  kind: agent
  recorded_at: '2026-11-22T17:45:44.879Z'
id: FACT-cli-json-format-alias
type: fact
---
