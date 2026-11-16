---
title: kibi prove reports an empty selection without a proof configuration
status: open
priority: should
firmness: firm
required_evidence: tested
tags:
  - proof
  - cli
semantic_text: kibi prove must report that no proof-bearing tests are selected, and exit 0, when its selection holds no proof-bearing test, whether or not the repository has a proof integration configuration.
rationale: A selection with nothing to prove never uses an integration, so failing on the missing configuration costs agents a setup detour for no evidence.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer reply (2026-11-16) to the proposal that a KB with nothing to prove should report "no proof-bearing tests selected" instead of failing: "Approve and yes."'
  recorded_at: '2026-11-16T13:35:29.316Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 697c97c03203c1b4665f357503316d29a67596c4fb180dc847a3d8d06b7cf83b
semantic_inventory:
  - claim_key: CLAIM-EA207241B433D88D
    claim_text: kibi prove must report that no proof-bearing tests are selected, and exit 0, when its selection holds no proof-bearing test, whether or not the repository has a proof integration configuration
    role: normative
    status: modeled
    span:
      start: 0
      end: 192
logic_claims:
  - CLAIM-EA207241B433D88D
id: REQ-cli-prove-empty-selection
type: req
---
kibi prove must report that no proof-bearing tests are selected, and exit 0, when its selection holds no proof-bearing test, whether or not the repository has a proof integration configuration.

## Context

Benchmark runs showed kibi prove failing with "No proof integration configuration" in workspaces where proof was not set up. kibi prove read the integration configuration before choosing tests, so a selection with nothing to prove also failed for a missing configuration it would never use. The maintainer asked on 2026-11-16 for prove to report "no proof-bearing tests selected" in that case; the configuration stays required as soon as a selected test needs an integration.

## Source

Maintainer reply (2026-11-16) to the proposal that a KB with nothing to prove should report "no proof-bearing tests selected" instead of failing: "Approve and yes."