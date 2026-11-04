---
title: Kibi bundles exactly seven canonical skills, including kibi-provable-code
status: open
priority: must
firmness: firm
tags:
  - skills
  - proof
semantic_text: The canonical Kibi skills must be exactly kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage.
semantic_clauses:
  - The canonical Kibi skills must be exactly kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."'
  approved_by: maintainer
  recorded_at: '2026-11-03T10:48:34.988Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: bb669e1036e156f9c43d3b496f967e6cb50007bbcb92221172928c749a47d6a8
semantic_inventory:
  - claim_key: CLAIM-37BA35FF6FA44A96
    claim_text: The canonical Kibi skills must be exactly kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage
    role: normative
    status: modeled
    span:
      start: 0
      end: 162
logic_claims:
  - CLAIM-37BA35FF6FA44A96
id: REQ-kibi-bundled-skill-catalog
type: req
---
The canonical Kibi skills must be exactly kibi-bootstrap, kibi-commit-review, kibi-decisions, kibi-freshness, kibi-provable-code, kibi-traceability and kibi-usage.

## Context

The CLI bundles the canonical skills under `packages/cli/src/public/skills/`, and the host plugins (kibi-claude, kibi-codex, kibi-cursor and its Agent Plugin, kibi-zcode) mirror them. Stating the set exactly means a skill that is added, removed or renamed fails this proof until the requirement says so.

`kibi-provable-code` teaches an agent to design code that implements a requirement (limits, allow-lists, roles, state machines, routes, environment and configuration reads, validators, error types) so Kibi can read it statically and prove claims about it exactly, what to do when a source proof or value read is refused because a name is built at run time, and how to treat generated or vendored code as a boundary. OpenCode routes code design, refused source reads and generated code to it.

## Source

Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested."
