---
title: Candidate requirements for an unlinked file put closed ones last and leave out replaced ones
status: open
priority: must
required_evidence: tested
tags:
  - search
  - hooks
semantic_text: The edit hook note and an impact kb_check for a file that no symbol links to a requirement must list current candidate requirements before closed candidate requirements. The edit hook note and an impact kb_check for a file that no symbol links to a requirement must not name a closed requirement that a current requirement supersedes.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b41ad6f3032ff7824d3f60412c03e1a1a90c664dcb0527d86853d22aeebd1167
semantic_inventory:
  - claim_key: CLAIM-13D084A4458B2E59
    claim_text: The edit hook note and an impact kb_check for a file that no symbol links to a requirement must list current candidate requirements before closed candidate requirements
    role: normative
    status: modeled
    span:
      start: 0
      end: 168
  - claim_key: CLAIM-27E2CE264574A3B2
    claim_text: The edit hook note and an impact kb_check for a file that no symbol links to a requirement must not name a closed requirement that a current requirement supersedes
    role: normative
    status: modeled
    span:
      start: 170
      end: 333
logic_claims:
  - CLAIM-13D084A4458B2E59
  - CLAIM-27E2CE264574A3B2
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-11T17:33:53.229Z'
id: REQ-unowned-file-closed-candidates
type: req
---
The edit hook note and an impact kb_check for a file that no symbol links to a requirement must list current candidate requirements before closed candidate requirements. The edit hook note and an impact kb_check for a file that no symbol links to a requirement must not name a closed requirement that a current requirement supersedes.

## Context

A file no symbol links gets candidate requirements whose titles share its path words. In a review of Kibi's own KB the first candidate for `packages/cli/src/commands/graph.ts` was closed `REQ-003`, a requirement four current requirements had replaced. The candidates are prompts to check, so a replaced requirement only sends the agent to an outdated rule; a closed one without a successor may still hold, so it stays, after the current ones. Supersedes links are read from front matter and relationship shards, and only when a closed requirement shares the words, so the hook does not read every requirement's links on each edit.

Issue 696 asked for it (acceptance: the `graph.ts` hook lookup offers no closed requirement); the maintainer opened it from that review.

## Source

Issue 696, "Search and hooks rank closed requirements as if current" (https://github.com/Looted/kibi/issues/696):

> Closed requirements are not demoted in ranking or in hook candidates.

> - When a closed requirement has a current successor (incoming `supersedes`, or children that `refines` it), rank the successor and drop the closed one from `governing` and from hook candidates.
> - Demote closed requirements with no successor below current ones. Once the retired status from the companion issue exists, exclude retired ones entirely.
> - Don't pull a successor into `governing` only because its closed predecessor matched weakly.
