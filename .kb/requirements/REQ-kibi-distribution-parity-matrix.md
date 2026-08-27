---
id: REQ-kibi-distribution-parity-matrix
title: Requirement-compiler behavior remains equal across resolved distributions
status: open
created_at: 2026-08-10T00:00:00Z
updated_at: 2026-08-10T00:00:00Z
source: documentation/requirements/REQ-kibi-distribution-parity-matrix.md
priority: must
tags: [requirements, parity, distribution, dogfood, packed, cli, mcp]
logic_claims:
  - CLAIM-46D4F2FCBD3E4628
  - CLAIM-D4F442D51F73F900
  - CLAIM-E7DC2A14F02FEDD8
  - CLAIM-6086A65134180EAB
  - CLAIM-79211E1126113C02
  - CLAIM-E8404CED2F77BE8D
  - CLAIM-0947EF59DD02C56C
  - CLAIM-7D05118C28DBC246
  - CLAIM-7E57A2030E72BFE2
  - CLAIM-DCF52E4C5B2191EF
  - CLAIM-F79F17C19AE64E32
semantic_clauses:
  - The runner must execute the same canonical fixture set against the source checkout, fresh CLI and MCP packages, and every project-resolved runtime
  - The canonical fixture set must include semantic inventory, contradiction witnesses, conservative proof, repair plans, verification receipts, and telemetry acceptance
  - Runtime provenance must come from actual executable or entrypoint resolution instead of package manifests
  - Normalization must remove volatile paths, timestamps, ephemeral identifiers, snapshots, and environment values while preserving stable statuses, gap codes, diagnostic identifiers, and contradiction witnesses
  - Capability evidence must use exactly one state from supported, unsupported, or failed
  - An unsupported capability must never count as a match
  - Packed outcomes must exactly equal source outcomes for every supported capability
  - Every project-resolved divergence must name an upgrade or compatibility action
  - The gate must fail for source-to-packed drift, unresolved provenance, execution failure, or an unactioned project divergence
  - The runner must execute resolved project binaries only inside isolated fixture workspaces without mutating audited project knowledge bases
  - The report must use a versioned deterministic machine-readable contract
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4d2a1c17e655c85a05bfab8e56aecf2b45227c1c23fd11fc76ca965055420ef6
semantic_inventory:
  - claim_key: CLAIM-46D4F2FCBD3E4628
    claim_text: The runner must execute the same canonical fixture set against the source checkout, fresh CLI and MCP packages, and every project-resolved runtime
    role: normative
    status: modeled
    span: {start: 0, end: 146}
  - claim_key: CLAIM-D4F442D51F73F900
    claim_text: The canonical fixture set must include semantic inventory, contradiction witnesses, conservative proof, repair plans, verification receipts, and telemetry acceptance
    role: normative
    status: modeled
    span: {start: 148, end: 313}
  - claim_key: CLAIM-E7DC2A14F02FEDD8
    claim_text: Runtime provenance must come from actual executable or entrypoint resolution instead of package manifests
    role: normative
    status: modeled
    span: {start: 315, end: 420}
  - claim_key: CLAIM-6086A65134180EAB
    claim_text: Normalization must remove volatile paths, timestamps, ephemeral identifiers, snapshots, and environment values while preserving stable statuses, gap codes, diagnostic identifiers, and contradiction witnesses
    role: normative
    status: modeled
    span: {start: 422, end: 629}
  - claim_key: CLAIM-79211E1126113C02
    claim_text: Capability evidence must use exactly one state from supported, unsupported, or failed
    role: normative
    status: modeled
    span: {start: 631, end: 716}
  - claim_key: CLAIM-E8404CED2F77BE8D
    claim_text: An unsupported capability must never count as a match
    role: normative
    status: modeled
    span: {start: 718, end: 771}
  - claim_key: CLAIM-0947EF59DD02C56C
    claim_text: Packed outcomes must exactly equal source outcomes for every supported capability
    role: normative
    status: modeled
    span: {start: 773, end: 854}
  - claim_key: CLAIM-7D05118C28DBC246
    claim_text: Every project-resolved divergence must name an upgrade or compatibility action
    role: normative
    status: modeled
    span: {start: 856, end: 934}
  - claim_key: CLAIM-7E57A2030E72BFE2
    claim_text: The gate must fail for source-to-packed drift, unresolved provenance, execution failure, or an unactioned project divergence
    role: normative
    status: modeled
    span: {start: 936, end: 1060}
  - claim_key: CLAIM-DCF52E4C5B2191EF
    claim_text: The runner must execute resolved project binaries only inside isolated fixture workspaces without mutating audited project knowledge bases
    role: normative
    status: modeled
    span: {start: 1062, end: 1200}
  - claim_key: CLAIM-F79F17C19AE64E32
    claim_text: The report must use a versioned deterministic machine-readable contract
    role: normative
    status: modeled
    span: {start: 1202, end: 1273}
links:
  - type: depends_on
    target: REQ-kibi-operation-interface-parity
  - type: depends_on
    target: REQ-kibi-conservative-requirement-proof
  - type: specified_by
    target: SCEN-kibi-distribution-parity-matrix
  - type: requires_predicate
    target: FACT-PARITY-RUNTIME-SET
  - type: requires_predicate
    target: FACT-PARITY-FIXTURE-SET
  - type: requires_predicate
    target: FACT-PARITY-PROVENANCE
  - type: requires_predicate
    target: FACT-PARITY-NORMALIZATION
  - type: requires_predicate
    target: FACT-PARITY-CAPABILITY-STATE
  - type: requires_predicate
    target: FACT-PARITY-UNSUPPORTED
  - type: requires_predicate
    target: FACT-PARITY-SOURCE-PACKED
  - type: requires_predicate
    target: FACT-PARITY-ACTION
  - type: requires_predicate
    target: FACT-PARITY-GATE
  - type: requires_predicate
    target: FACT-PARITY-ISOLATION
  - type: requires_predicate
    target: FACT-PARITY-REPORT
---

The runner must execute the same canonical fixture set against the source checkout, fresh CLI and MCP packages, and every project-resolved runtime. The canonical fixture set must include semantic inventory, contradiction witnesses, conservative proof, repair plans, verification receipts, and telemetry acceptance. Runtime provenance must come from actual executable or entrypoint resolution instead of package manifests. Normalization must remove volatile paths, timestamps, ephemeral identifiers, snapshots, and environment values while preserving stable statuses, gap codes, diagnostic identifiers, and contradiction witnesses. Capability evidence must use exactly one state from supported, unsupported, or failed. An unsupported capability must never count as a match. Packed outcomes must exactly equal source outcomes for every supported capability. Every project-resolved divergence must name an upgrade or compatibility action. The gate must fail for source-to-packed drift, unresolved provenance, execution failure, or an unactioned project divergence. The runner must execute resolved project binaries only inside isolated fixture workspaces without mutating audited project knowledge bases. The report must use a versioned deterministic machine-readable contract.
