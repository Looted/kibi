---
id: REQ-kibi-logical-requirement-coverage
title: Normative requirements have clause-complete logical representations
status: open
created_at: 2026-08-04T00:00:00Z
updated_at: 2026-08-04T00:00:00Z
source: documentation/requirements/REQ-kibi-logical-requirement-coverage.md
priority: must
tags: [requirements, prolog, predicates, contradictions, semantic-advisor, umbrella]
semantic_text: "Every atomic normative clause in a requirement must have a stable claim key and a linked ground property or predicate fact. Current requirements with opposite polarities over the same ground predicate term must produce a blocking contradiction. Every current requirement without a logic_claims manifest must receive a non-blocking logical-coverage debt diagnostic. The logic-coverage rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt. Kibi must reject a ground fact when its claim_key is not the stable key derived from claim_text. MCP tool schemas must preserve claim-key patterns. MCP tool schemas must preserve logic-claim uniqueness constraints. MCP tool schemas must preserve conditional claim provenance requirements. Staged validation overlays must preserve requirement logic_claims manifests. Staged validation overlays must preserve every typed predicate fact field. Staged validation overlays must preserve typed test verification metadata."
logic_claims:
  - CLAIM-B7EDA6002F1B38E1
  - CLAIM-AB495994E2FB1C33
  - CLAIM-5C075A0CE1F05208
  - CLAIM-ECAE7557CD5C48F8
  - CLAIM-6A1D53864E9D3D90
  - CLAIM-132B6D1222244173
  - CLAIM-3CBD873F99A468BD
  - CLAIM-3C684BC9D8615DF1
  - CLAIM-6147C3D428852FD3
  - CLAIM-20FA89A0E6B17C19
  - CLAIM-3FA5A045CEB60211
semantic_clauses:
  - "Every atomic normative clause in a requirement must have a stable claim key and a linked ground property or predicate fact."
  - "Current requirements with opposite polarities over the same ground predicate term must produce a blocking contradiction."
  - "Every current requirement without a logic_claims manifest must receive a non-blocking logical-coverage debt diagnostic."
  - "The logic-coverage rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt."
  - "Kibi must reject a ground fact when its claim_key is not the stable key derived from claim_text."
  - "MCP tool schemas must preserve claim-key patterns."
  - "MCP tool schemas must preserve logic-claim uniqueness constraints."
  - "MCP tool schemas must preserve conditional claim provenance requirements."
  - "Staged validation overlays must preserve requirement logic_claims manifests."
  - "Staged validation overlays must preserve every typed predicate fact field."
  - "Staged validation overlays must preserve typed test verification metadata."
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 87003dac88644af22d647267a5892a3f7771a473d27bed5209fc182514778cad
semantic_inventory:
  - claim_key: CLAIM-B7EDA6002F1B38E1
    claim_text: "Every atomic normative clause in a requirement must have a stable claim key and a linked ground property or predicate fact"
    role: normative
    status: modeled
    span:
      start: 0
      end: 122
  - claim_key: CLAIM-AB495994E2FB1C33
    claim_text: "Current requirements with opposite polarities over the same ground predicate term must produce a blocking contradiction"
    role: normative
    status: modeled
    span:
      start: 124
      end: 243
  - claim_key: CLAIM-5C075A0CE1F05208
    claim_text: "Every current requirement without a logic_claims manifest must receive a non-blocking logical-coverage debt diagnostic"
    role: normative
    status: modeled
    span:
      start: 245
      end: 363
  - claim_key: CLAIM-ECAE7557CD5C48F8
    claim_text: "The logic-coverage rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt"
    role: normative
    status: modeled
    span:
      start: 365
      end: 513
  - claim_key: CLAIM-6A1D53864E9D3D90
    claim_text: "Kibi must reject a ground fact when its claim_key is not the stable key derived from claim_text"
    role: normative
    status: modeled
    span:
      start: 515
      end: 610
  - claim_key: CLAIM-132B6D1222244173
    claim_text: "MCP tool schemas must preserve claim-key patterns"
    role: normative
    status: modeled
    span:
      start: 612
      end: 661
  - claim_key: CLAIM-3CBD873F99A468BD
    claim_text: "MCP tool schemas must preserve logic-claim uniqueness constraints"
    role: normative
    status: modeled
    span:
      start: 663
      end: 728
  - claim_key: CLAIM-3C684BC9D8615DF1
    claim_text: "MCP tool schemas must preserve conditional claim provenance requirements"
    role: normative
    status: modeled
    span:
      start: 730
      end: 802
  - claim_key: CLAIM-6147C3D428852FD3
    claim_text: "Staged validation overlays must preserve requirement logic_claims manifests"
    role: normative
    status: modeled
    span:
      start: 804
      end: 879
  - claim_key: CLAIM-20FA89A0E6B17C19
    claim_text: "Staged validation overlays must preserve every typed predicate fact field"
    role: normative
    status: modeled
    span:
      start: 881
      end: 954
  - claim_key: CLAIM-3FA5A045CEB60211
    claim_text: "Staged validation overlays must preserve typed test verification metadata"
    role: normative
    status: modeled
    span:
      start: 956
      end: 1029
links:
  - type: specified_by
    target: SCEN-kibi-logical-requirement-coverage
  - type: verified_by
    target: TEST-kibi-logical-requirement-coverage
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-ATOMIC-CLAUSE
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-POLARITY-CONFLICT
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-DEBT-DIAGNOSTIC
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-DEFAULT-RULE
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-CLAIM-KEY-INTEGRITY
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-MCP-CLAIM-KEY-PATTERN
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-MCP-CLAIM-UNIQUENESS
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-MCP-PROVENANCE-PAIR
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-STAGED-MANIFEST
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-STAGED-PREDICATE-FIELDS
  - type: requires_predicate
    target: FACT-LOGICAL-COVERAGE-STAGED-TEST-METADATA
  - type: relates_to
    target: REQ-skillopt-predicate-first-requirements
---

Every atomic normative clause in a requirement must have a stable claim key and a linked ground property or predicate fact.

Current requirements with opposite polarities over the same ground predicate term must produce a blocking contradiction.

Every current requirement without a `logic_claims` manifest must receive a non-blocking logical-coverage debt diagnostic.

The `logic-coverage` rule must run by default for explicitly manifested requirements while requirements without manifests remain gradual-backfill debt.

Kibi must reject a ground fact when its `claim_key` is not the stable key derived from `claim_text`.

MCP tool schemas must preserve claim-key patterns.

MCP tool schemas must preserve logic-claim uniqueness constraints.

MCP tool schemas must preserve conditional claim provenance requirements.

Staged validation overlays must preserve requirement `logic_claims` manifests.

Staged validation overlays must preserve every typed predicate fact field.

Staged validation overlays must preserve typed test verification metadata.

Human-readable prose remains authoritative for review, but a single logical edge cannot make a compound requirement complete. Kibi validates the explicit `logic_claims` manifest against linked ground facts. The semantic advisor exposes its clause inventory so an agent or operator can correct incomplete automatic decomposition before mutation.

Logical coverage is bijective at the atomic-clause boundary: one claim key corresponds to one linked ground fact. Formatting-only trailing punctuation shares one claim identity, and two distinct keys cannot claim the same canonical property or predicate term as separate coverage. Exact entity readback preserves every repeated relationship target so this correspondence remains auditable.

Kibi does not claim unrestricted natural-language theorem proving. Structural coverage proves that declared clauses were grounded; semantic review proves the clause inventory and term mapping preserve the source meaning. Exact predicate `assert`/`deny` conflicts are a sound generic contradiction rule. Richer ontology-specific conflicts require shared canonical schemas and explicitly modeled arguments rather than guessed equivalence.
