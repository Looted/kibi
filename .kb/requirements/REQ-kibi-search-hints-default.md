---
title: Search hints are on by default and a project opts out through declinedPlugins
status: open
priority: must
firmness: firm
required_evidence: tested
tags:
  - search
  - plugins
semantic_text: A project that configures no search hints provider and has not declined kibi-plugin-search-hints shall get the bundled search hints provider. A project that lists kibi-plugin-search-hints in kibi.declinedPlugins shall get no bundled search hints provider. A search hints provider that a project configures shall take the place of the bundled search hints provider.
semantic_clauses:
  - A project that configures no search hints provider and has not declined kibi-plugin-search-hints shall get the bundled search hints provider.
  - A project that lists kibi-plugin-search-hints in kibi.declinedPlugins shall get no bundled search hints provider.
  - A search hints provider that a project configures shall take the place of the bundled search hints provider.
logic_claims:
  - CLAIM-A30523B75B3936E0
  - CLAIM-87FE84E4509746FE
  - CLAIM-98496444EE368AA1
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fb053dd4c4c14a742ea0c5044bf683753efef75fb21b8a6804413ec91742ecc6
semantic_inventory:
  - claim_key: CLAIM-A30523B75B3936E0
    claim_text: A project that configures no search hints provider and has not declined kibi-plugin-search-hints shall get the bundled search hints provider
    role: normative
    status: modeled
    span:
      start: 0
      end: 140
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-87FE84E4509746FE
    claim_text: A project that lists kibi-plugin-search-hints in kibi.declinedPlugins shall get no bundled search hints provider
    role: normative
    status: modeled
    span:
      start: 142
      end: 254
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-98496444EE368AA1
    claim_text: A search hints provider that a project configures shall take the place of the bundled search hints provider
    role: normative
    status: modeled
    span:
      start: 256
      end: 363
    reason: Grounded by the linked fact with this claim key.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-24, on the question "Ship search hints on by default, or only offer them at every size?": "On by default, opt-out".'
  approved_by: maintainer
  recorded_at: '2026-11-24T08:21:34.406Z'
rationale: The maintainer chose to ship search hints on by default with an opt-out, so a question worded unlike the knowledge base gets suggestions instead of an empty answer.
id: REQ-kibi-search-hints-default
type: req
---
A project that configures no search hints provider and has not declined kibi-plugin-search-hints shall get the bundled search hints provider. A project that lists kibi-plugin-search-hints in kibi.declinedPlugins shall get no bundled search hints provider. A search hints provider that a project configures shall take the place of the bundled search hints provider.

## Context

The maintainer chose to ship search hints on by default with an opt-out, so a question worded unlike the knowledge base gets suggestions instead of an empty answer.

## Source

> Maintainer decision, 2026-11-24, on the question "Ship search hints on by default, or only offer them at every size?": "On by default, opt-out".
