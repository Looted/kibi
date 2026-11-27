---
title: Vibe skill mirror is generated with name=id and drift-checked in CI
status: open
semantic_text: sync-agent-skills must mirror the canonical skills into packages/vibe/skills with the frontmatter name set to the skill id. CI must run the vibe skill mirror drift check.
semantic_clauses:
  - sync-agent-skills must mirror the canonical skills into packages/vibe/skills with the frontmatter name set to the skill id
  - CI must run the vibe skill mirror drift check
semantic_inventory:
  - claim_key: CLAIM-6810856A24877650
    claim_text: sync-agent-skills must mirror the canonical skills into packages/vibe/skills with the frontmatter name set to the skill id
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
  - claim_key: CLAIM-F08FBAD7C628995B
    claim_text: CI must run the vibe skill mirror drift check
    role: normative
    status: modeled
    span:
      start: 124
      end: 169
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b9f5c5e1a1418a1abad381b9a11ed755a5d028dac58181a96ede9d3589269c77
logic_claims:
  - CLAIM-6810856A24877650
  - CLAIM-F08FBAD7C628995B
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24: Approved (claim texts as listed).'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:51.173Z'
id: REQ-vibe-skills-mirror
type: req
firmness: firm
---

## Context

Requested by the maintainer (2026-11-19): like the other host plugin bundles, kibi-vibe mirrors the canonical skills into packages/vibe/skills via sync-agent-skills --target vibe, with the frontmatter name set to the skill id because Vibe requires name to match the skill directory, and CI drift-checks the mirror. Source: scripts/sync-agent-skills.ts, .github/workflows/ci.yml.

See the linked scenarios for the executable behavior.

## Source

> Maintainer approval, 2026-11-24: Approved (claim texts as listed).
