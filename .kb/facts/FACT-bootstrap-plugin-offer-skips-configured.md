---
title: The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - provenance:req-bootstrap-ui-plugin-offer
text_ref: REQ-bootstrap-ui-plugin-offer
fact_kind: property_value
subject_key: bootstrap.plugin_offer
property_key: skips_activated_or_declined_plugins
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-37B80ACA54E6C0C6
claim_text: The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:14:04.659Z'
id: FACT-bootstrap-plugin-offer-skips-configured
type: fact
---
The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins.

Recorded as a strict boolean semantic fact about `bootstrap.plugin_offer` so REQ-bootstrap-ui-plugin-offer can be checked for contradictions.
