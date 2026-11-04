---
id: REQ-prolog-library-adoption
title: Adopt maintained Prolog libraries for bounded graph capabilities
status: open
created_at: 2026-06-02T00:00:00.000Z
updated_at: 2026-06-02T00:00:00.000Z
source: docs/mcp-reference.md
priority: should
owner: core-team
tags:
  - prolog
  - mcp
  - sparql
  - traceability
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-prolog-library-adoption
  - type: verified_by
    target: TEST-prolog-library-adoption-core
  - type: verified_by
    target: TEST-prolog-library-adoption-mcp
semantic_text: Kibi must keep CHR-derived facts isolated from the existing validation path. Kibi must keep SPARQL support remote-only and opt-in. Kibi must expose the remote SPARQL capability through the curated MCP surface, validating endpoint safety and accepting only SELECT queries.
logic_claims:
  - CLAIM-4BEDE5673C5CCFA9
  - CLAIM-1077A10EE27B517A
  - CLAIM-6AF26FA207F4CC74
semantic_clauses:
  - Kibi must keep CHR-derived facts isolated from the existing validation path.
  - Kibi must keep SPARQL support remote-only and opt-in.
  - Kibi must expose the remote SPARQL capability through the curated MCP surface, validating endpoint safety and accepting only SELECT queries.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4420310bc6930a3ae47e088a3c8affc4ef9c1638f143db5e779ee2bc7d372955
semantic_inventory:
  - claim_key: CLAIM-4BEDE5673C5CCFA9
    claim_text: Kibi must keep CHR-derived facts isolated from the existing validation path
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
  - claim_key: CLAIM-1077A10EE27B517A
    claim_text: Kibi must keep SPARQL support remote-only and opt-in
    role: normative
    status: modeled
    span:
      start: 77
      end: 129
  - claim_key: CLAIM-6AF26FA207F4CC74
    claim_text: Kibi must expose the remote SPARQL capability through the curated MCP surface, validating endpoint safety and accepting only SELECT queries
    role: normative
    status: modeled
    span:
      start: 131
      end: 270
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
firmness: default
required_evidence: tested
rationale: "Maintained Prolog libraries give graph capabilities without new custom code, and keeping CHR and SPARQL isolated and opt-in protects the validation path and the default security posture."
---
- Kibi must keep CHR-derived facts isolated from the existing validation path.
- Kibi must keep SPARQL support remote-only and opt-in.
- Kibi must expose the remote SPARQL capability through the curated MCP surface, validating endpoint safety and accepting only SELECT queries.
