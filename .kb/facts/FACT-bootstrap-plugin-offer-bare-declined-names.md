---
title: Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-bootstrap-ui-plugin-offer
text_ref: REQ-bootstrap-ui-plugin-offer
fact_kind: property_value
subject_key: bootstrap.plugin_offer
property_key: rejects_non_bare_declined_names
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-A988B560F7A5C46D
claim_text: Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:14:05.263Z'
id: FACT-bootstrap-plugin-offer-bare-declined-names
type: fact
---
Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name.

Recorded as a strict boolean semantic fact about `bootstrap.plugin_offer` so REQ-bootstrap-ui-plugin-offer can be checked for contradictions.
