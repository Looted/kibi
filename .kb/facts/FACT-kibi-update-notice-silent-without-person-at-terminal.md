---
title: The update notice must stay silent when stderr is not a terminal, when the command prints JSON, in CI and test runs, and when KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER is set
status: active
text_ref: REQ-kibi-update-notice
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-kibi-update-notice
fact_kind: property_value
subject_key: kibi.cli.update_notice
property_key: silent_without_person_at_terminal
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-155C8CB648B84046
claim_text: The update notice must stay silent when stderr is not a terminal, when the command prints JSON, in CI and test runs, and when KIBI_UPDATE_CHECK=0 or NO_UPDATE_NOTIFIER is set
origin:
  kind: agent
  recorded_at: '2026-11-04T13:22:27.778Z'
id: FACT-kibi-update-notice-silent-without-person-at-terminal
type: fact
---
