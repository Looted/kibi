---
title: Bootstrap offers the UI plugin once and respects a decline
status: active
tags:
  - bootstrap
  - plugins
  - ui
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:14:05.885Z'
id: SCEN-bootstrap-ui-plugin-offer
type: scenario
---
Given a workspace with production tsx or Angular component files and no kibi plugin configuration, when kb_plan_bootstrap runs, then pluginOffers names kibi-plugin-ui with kibi.check-policy.v1, the file count and up to five evidence paths, and recommendedActions carries a plugin_offer action that says how to accept or decline before the final check action. Given only stories or test component files, or a package.json that activates kibi-plugin-ui or lists it in kibi.declinedPlugins, then no offer is made. Given a kibi.declinedPlugins entry that is a path or not a string, then project configuration validation rejects it.
