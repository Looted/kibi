---
id: REQ-cli-usage-metrics-v1
title: CLI usage metrics command summarizes diagnostic usage events
status: open
created_at: 2026-05-29T00:00:00.000Z
updated_at: 2026-05-29T00:00:00.000Z
source: packages/cli/src/commands/usage-metrics.ts
priority: should
tags:
  - cli
  - usage-metrics
links:
  - type: specified_by
    target: SCEN-cli-usage-metrics-v1
  - type: verified_by
    target: TEST-cli-usage-metrics-v1
semantic_text: The CLI provides a usage metrics command that summarizes diagnostic usage events for audit and maintenance workflows.
logic_claims:
  - CLAIM-271E3E84AC325156
semantic_clauses:
  - The CLI provides a usage metrics command that summarizes diagnostic usage events for audit and maintenance workflows
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 66990bb51f5ad3227a1065f2d169e7d50086ca5a65fde84f6fe3ef2b9839fbb5
semantic_inventory:
  - claim_key: CLAIM-271E3E84AC325156
    claim_text: The CLI provides a usage metrics command that summarizes diagnostic usage events for audit and maintenance workflows
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 116
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-11, approving entity context that was inferred (not recorded in history) in the KB gold-standard review (context batch 9, inferred): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---

The CLI provides a usage metrics command that summarizes diagnostic usage events for audit and maintenance workflows.

## Why
Maintainers need to see whether agents actually use Kibi as intended, for example whether they consult before writing, without reading raw logs. Inferred from: docs/cli-reference.md, "Reports adoption and quality metrics from `.kb/usage.log`"; the telemetry acceptance work.
