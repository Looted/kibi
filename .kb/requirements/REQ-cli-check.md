---
id: REQ-cli-check
title: Command-line KB validation and integrity checks
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: must
tags:
  - cli
  - validation
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-005
  - type: verified_by
    target: TEST-004
semantic_text: The `kibi check` command runs validation rules against the branch KB to ensure structural integrity and requirement coverage. It can be restricted to specific rules or focused on staged changes (used in pre-commit hooks). Failure results in a non-zero exit code and descriptive violation logs.
semantic_clauses:
  - The `kibi check` command runs validation rules against the branch KB to ensure structural integrity and requirement coverage.
  - It can be restricted to specific rules or focused on staged changes (used in pre-commit hooks).
  - Failure results in a non-zero exit code and descriptive violation logs.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 06953d78300eac2bed021a23f2a7178c7973af4ce47e6afdbe500f844e8b114a
logic_claims:
  - CLAIM-16F84736A1B01D5B
  - CLAIM-5E64EE51B2FCE374
  - CLAIM-F0BB0D90E442DB1A
semantic_inventory:
  - claim_key: CLAIM-16F84736A1B01D5B
    claim_text: The `kibi check` command runs validation rules against the branch KB to ensure structural integrity and requirement coverage
    payload_hash: 747c70a1f4cb53d49d3379547d4570150768dc4cf9d5d8abdab1e343fdbb3b16
    reason: Grounded by FACT-PROP-CHECK-RULES-ENFORCED via requires_property.
    role: descriptive
    span:
      end: 124
      start: 0
    status: modeled
  - claim_key: CLAIM-5E64EE51B2FCE374
    claim_text: It can be restricted to specific rules or focused on staged changes (used in pre-commit hooks)
    payload_hash: 747c70a1f4cb53d49d3379547d4570150768dc4cf9d5d8abdab1e343fdbb3b16
    reason: Grounded by FACT-PROP-CHECK-RULE-SELECTION via requires_property.
    role: descriptive
    span:
      end: 220
      start: 126
    status: modeled
  - claim_key: CLAIM-F0BB0D90E442DB1A
    claim_text: Failure results in a non-zero exit code and descriptive violation logs
    payload_hash: 747c70a1f4cb53d49d3379547d4570150768dc4cf9d5d8abdab1e343fdbb3b16
    reason: Grounded by FACT-PROP-CHECK-FAILURE-EXIT-CODE via requires_property.
    role: descriptive
    span:
      end: 292
      start: 222
    status: modeled
type: req
---

The `kibi check` command runs validation rules against the branch KB to ensure structural integrity and requirement coverage.
It can be restricted to specific rules or focused on staged changes (used in pre-commit hooks).
Failure results in a non-zero exit code and descriptive violation logs.
