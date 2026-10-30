---
title: Package-provenance-unresolved actions when every probed package resolves = 0
status: active
tags:
  - strict-lane
fact_kind: property_value
subject_key: kibi.cli.doctor
property_key: provenance_unresolved_actions_when_all_packages_resolve
operator: eq
value_type: int
value_int: 0
polarity: require
canonical_key: kibi.cli.doctor:provenance_unresolved_actions_when_all_packages_resolve:eq:0
claim_key: CLAIM-BEE788A61C4A7D8B
claim_text: The doctor must not emit the package-provenance-unresolved migration action when every probed Kibi package resolves to an installed manifest
id: FACT-PROP-REQ-CLI-DOCTOR-PACKED-PROVENANCE-C02
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
