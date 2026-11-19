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
  ref: 'Maintainer review of PR #818, 2026-11-19: the five kibi-vibe requirements state the intended behavior and are approved as written.'
  approved_by: maintainer
  recorded_at: '2026-11-19T20:09:51.173Z'
id: REQ-vibe-skills-mirror
type: req
---
## Context

Requested by the maintainer (2026-11-19): every host plugin mirrors the canonical skills; the Vibe mirror needs name=id frontmatter (Vibe requires name to match the directory) and a CI drift check like the other hook bundles. Source: scripts/sync-agent-skills.ts and .github/workflows/ci.yml.

See the linked scenario for the executable behavior.