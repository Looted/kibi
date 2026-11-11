---
title: A legacy .kb/config.json is only detected and read to plan the storage migration; malformed JSON blocks the migration
status: open
semantic_text: Kibi must use a legacy .kb/config.json only to detect and plan the legacy storage migration, and must report malformed JSON as a migration blocker instead of guessing paths.
semantic_clauses:
  - Kibi must use a legacy .kb/config.json only to detect and plan the legacy storage migration, and must report malformed JSON as a migration blocker instead of guessing paths
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a9db15b2fd5117ce26e626c5eef50284a6aa791d4f081822a2e5845e2e15b22c
semantic_inventory:
  - claim_key: CLAIM-4E9C7220BB29F2A0
    claim_text: Kibi must use a legacy .kb/config.json only to detect and plan the legacy storage migration, and must report malformed JSON as a migration blocker instead of guessing paths
    role: normative
    status: modeled
    span:
      start: 0
      end: 172
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4E9C7220BB29F2A0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:31:45.658Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - init
  - migration
  - kb-layout
id: REQ-kibi-legacy-config-read-only
type: req
---
Kibi must use a legacy .kb/config.json only to detect and plan the legacy storage migration, and must report malformed JSON as a migration blocker instead of guessing paths.

## Context

Older workspaces configured entity paths in .kb/config.json. Canonical Kibi never writes that file: kibi init and MCP workspace activation only notice it exists and point to kibi migrate, and the migration plan reads its paths to know which files to move. When the JSON is malformed the plan reports a blocker and moves nothing, because silently falling back to default legacy paths could move the wrong files.

Carved out of REQ-cli-init-canonical, which keeps what kibi init writes; this child names the only use Kibi still makes of a legacy .kb/config.json.

## Source

> Maintainer decision, 2026-11-10, approving the reworded children in the KB gold-standard review (batch 5 rewordings): "Ok"
