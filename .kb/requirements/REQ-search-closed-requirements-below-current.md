---
title: Search ranks a closed requirement below a current one that matches as well
status: open
priority: must
required_evidence: tested
tags:
  - search
  - hooks
semantic_text: kb_search must rank a closed requirement that no current requirement supersedes below a current requirement that matches the query as well. A kb_search answer must list a closed requirement it reaches through a matched fact, scenario or test after a current requirement it reaches as well.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6d4d8ff1b411e0c361dae4813f17232314b63966f9807d5c1fbf88af40a05b81
semantic_inventory:
  - claim_key: CLAIM-50150CD75DD422B5
    claim_text: kb_search must rank a closed requirement that no current requirement supersedes below a current requirement that matches the query as well
    role: normative
    status: modeled
    span:
      start: 0
      end: 138
  - claim_key: CLAIM-EB84071A3A98BEFC
    claim_text: A kb_search answer must list a closed requirement it reaches through a matched fact, scenario or test after a current requirement it reaches as well
    role: normative
    status: modeled
    span:
      start: 140
      end: 288
logic_claims:
  - CLAIM-50150CD75DD422B5
  - CLAIM-EB84071A3A98BEFC
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:40.133Z'
id: REQ-search-closed-requirements-below-current
type: req
---
kb_search must rank a closed requirement that no current requirement supersedes below a current requirement that matches the query as well. A kb_search answer must list a closed requirement it reaches through a matched fact, scenario or test after a current requirement it reaches as well.

## Context

For a requirement, `closed` means either done and still valid or retired with nothing to replace it. kb_search treated it exactly like an open requirement: in a review of Kibi's own KB, closed `REQ-003` ranked at 0.58 for the hook lookup of `packages/cli/src/commands/graph.ts`, and closed `REQ-skillopt-codex-optimization` ranked third in two unrelated questions. Splitting broad requirements had raised the number of closed requirements in that KB to 94, so this showed up often. Closed cannot be dropped, since it may still hold, so it ranks below a current requirement that matches as well: three quarters of the score in the ranked results, and the same factor in the answer for a closed requirement reached through a matched fact, scenario or test. A superseded requirement keeps its stronger demotion. Retired requirements get their own status in a companion issue and are then excluded.

Issue 696 asked for it; the maintainer opened it from that review.

## Source

Issue 696, "Search and hooks rank closed requirements as if current" (https://github.com/Looted/kibi/issues/696):

> Closed requirements are not demoted in ranking or in hook candidates.

> - When a closed requirement has a current successor (incoming `supersedes`, or children that `refines` it), rank the successor and drop the closed one from `governing` and from hook candidates.
> - Demote closed requirements with no successor below current ones. Once the retired status from the companion issue exists, exclude retired ones entirely.
> - Don't pull a successor into `governing` only because its closed predecessor matched weakly.
