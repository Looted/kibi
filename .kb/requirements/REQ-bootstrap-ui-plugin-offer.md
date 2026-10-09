---
title: Bootstrap offers kibi-plugin-ui when it finds UI components and remembers a decline
status: open
priority: must
tags:
  - bootstrap
  - plugins
  - ui
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:14:07.254Z'
rationale: Kibi aims to stay mostly configuration-less, so an optional plugin should be offered when the workspace shows it fits instead of requiring hand configuration.
semantic_text: The bootstrap plan must offer kibi-plugin-ui when production React or Angular component files exist. The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins. Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 911b161b6deeb661762e6d6d93e9e82e5a7865c8a26920ff096cdd91234d0a08
semantic_inventory:
  - claim_key: CLAIM-EF3FD57F9F7780C1
    claim_text: The bootstrap plan must offer kibi-plugin-ui when production React or Angular component files exist
    role: normative
    status: modeled
    span:
      start: 0
      end: 99
  - claim_key: CLAIM-37B80ACA54E6C0C6
    claim_text: The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins
    role: normative
    status: modeled
    span:
      start: 101
      end: 204
  - claim_key: CLAIM-A988B560F7A5C46D
    claim_text: Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name
    role: normative
    status: modeled
    span:
      start: 206
      end: 311
semantic_clauses:
  - The bootstrap plan must offer kibi-plugin-ui when production React or Angular component files exist.
  - The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins.
  - Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name.
logic_claims:
  - CLAIM-EF3FD57F9F7780C1
  - CLAIM-37B80ACA54E6C0C6
  - CLAIM-A988B560F7A5C46D
id: REQ-bootstrap-ui-plugin-offer
type: req
---
The bootstrap plan must offer kibi-plugin-ui when production React or Angular component files exist. The bootstrap plan must not offer a plugin that package.json activates or lists in kibi.declinedPlugins. Project configuration validation must reject a kibi.declinedPlugins entry that is not a bare package name.

## Context

The project owner suggested that UI support should be an init or bootstrap question, such as detecting template files and asking whether to enable UI support, rather than a manual setting. The agreed design has kb_plan_bootstrap return pluginOffers and a plugin_offer action outside the plan hash, with the agent asking the human; a declined offer is recorded as package.json kibi.declinedPlugins so it is not offered again, and Kibi itself never edits package.json.

## Source

> So maybe this should be an init/bootstrap thing - html files detected in the proejct, do you want to enable the UI support kind of thing.

Project owner, project thread on the UI design plugin, 2026-10-09.
