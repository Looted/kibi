---
title: kibi migrate --apply-safe migrates an attached legacy branch store under its previewed plan
status: open
priority: must
required_evidence: tested
semantic_text: kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated.
semantic_clauses:
  - kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6ca673a3076695de3656f3c238160544a730815ab50119f19c589d08e55f1ced
semantic_inventory:
  - claim_key: CLAIM-68C5169549CC9104
    claim_text: kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated
    role: normative
    status: modeled
    span:
      start: 0
      end: 263
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-68C5169549CC9104
tags:
  - git
  - branching
  - storage
  - migration
  - cli
origin:
  kind: agent
  recorded_at: '2026-11-15T17:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-15: approved this requirement statement as written.'
id: REQ-kibi-cli-legacy-apply-safe
type: req
---
kibi migrate --apply-safe must apply an approved legacy branch migration against the legacy store its plan previewed, running that migration before it starts the KB engine, and must not create an empty hashed branch store beside a legacy store it has not migrated.

## Context

kb_apply_plan already migrated a legacy literal-path branch store over MCP. Through the CLI, kibi migrate --apply-safe opened an engine before the plan ran; the engine serves only the hashed store path, so it created an empty store there, the plan's snapshot check failed with "KB snapshot changed since planning", and the empty store then made the legacy migration non-automatic. The CLI apply now starts the engine only once the legacy migration has moved the store.

## Source

> Maintainer, in review on 2026-11-15: approved this requirement statement as written.