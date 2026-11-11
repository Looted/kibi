---
title: The builtin ontology pack matches requirement prose to core, policy and product predicate rules deterministically
status: open
semantic_text: The builtin ontology pack must match requirement prose to the core, policy and product predicate rules deterministically.
semantic_clauses:
  - The builtin ontology pack must match requirement prose to the core, policy and product predicate rules deterministically
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 644f391e1877d78a4f4b1404a939a8f6dcd806da5f5f8b2005bd32b582af675e
semantic_inventory:
  - claim_key: CLAIM-5CF7A8B79EB459A0
    claim_text: The builtin ontology pack must match requirement prose to the core, policy and product predicate rules deterministically
    role: normative
    status: modeled
    span:
      start: 0
      end: 120
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5CF7A8B79EB459A0
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:41:20.233Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - plugins
  - ontology
id: REQ-kibi-builtin-ontology-pack
type: req
---
The builtin ontology pack must match requirement prose to the core, policy and product predicate rules deterministically.

## Context

The pack walks the launcher, core, policy, product and product-tail rule sets in a fixed order and returns the hits of the first set that matches, so the same sentence always yields the same predicate candidate, and prose that no rule matches yields none.

Carved out of REQ-capability-plugin-builtin-parity-v1, which keeps the rule that the host uses only the builtin providers when kibi.plugins is absent; each child names what one builtin provider decides.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
