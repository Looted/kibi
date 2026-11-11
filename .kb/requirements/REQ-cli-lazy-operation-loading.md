---
title: CLI startup loads only the selected command while its registration metadata matches the operation catalog exactly
status: open
semantic_text: CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog.
semantic_clauses:
  - CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0e2756369b96a37f0aff47936198c7dab8ad9004277078ffb61518e931fe3923
semantic_inventory:
  - claim_key: CLAIM-86A9CDC403DEED58
    claim_text: CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog
    role: normative
    status: modeled
    span:
      start: 0
      end: 167
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-86A9CDC403DEED58
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:01:41.602Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - cli
  - performance
  - startup
id: REQ-cli-lazy-operation-loading
type: req
---
CLI startup MUST lazily load selected command implementations while lightweight registration metadata remains exactly equivalent to the authoritative operation catalog.

## Context

Loading every command at startup made the CLI slow, so it registers commands from lightweight metadata and loads one implementation on demand; that metadata must match the catalog so registration never drifts.

Kibi's tests start many Prolog engines, so they must stay isolated and always be stopped, the suites must run in parallel without losing results, and the CLI must start fast without its registration drifting from the commands it runs.

## Why this changed

Split from REQ-test-journaled-engine-harness, which held three behaviors: engine isolation and cleanup in tests, bounded concurrency of the packed and root suite runners, and lazy loading of CLI commands. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
