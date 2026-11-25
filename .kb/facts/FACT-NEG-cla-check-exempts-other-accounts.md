---
title: The CLA check exempts accounts other than the maintainer and bots
status: active
text_ref: .github/workflows/cla.yml
tags:
  - negative-path
  - fact:property_value
fact_kind: property_value
subject_key: kibi.repository.cla_check
property_key: exempts_only_maintainer_and_bots
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-25T06:12:14.496Z'
id: FACT-NEG-cla-check-exempts-other-accounts
type: fact
---
The failure case for the CLA allowlist: an outside account is exempt from signing, which the requirement forbids.