---
id: REQ-cli-doctor
title: Diagnose environment and KB health
status: open
created_at: 2026-05-13T10:00:00.000Z
updated_at: 2026-05-13T10:00:00.000Z
source: REQ-003
priority: must
tags:
  - cli
  - doctor
links:
  - type: supersedes
    target: REQ-003
  - type: specified_by
    target: SCEN-001
semantic_text: The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git) and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy. It provides actionable remediation steps for failed checks.
semantic_clauses:
  - The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git) and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy.
  - It provides actionable remediation steps for failed checks.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a5e375ec89b77691766f2ef2d9bc9c1ec6cbfa2fbd31d4195e74505ebf6a2d41
logic_claims:
  - CLAIM-B57914657DBD0FDB
  - CLAIM-063781AB551B97E0
semantic_inventory:
  - claim_key: CLAIM-B57914657DBD0FDB
    claim_text: The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git) and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy
    role: descriptive
    status: modeled
    span:
      start: 0
      end: 216
    payload_hash: 01ba1d01b96cb5f85fcd0bb8220ff81328a64364e06ba16538857da9a7c2be0e
    reason: Grounded by FACT-cli-doctor-BD0FDB via requires_predicate.
  - claim_key: CLAIM-063781AB551B97E0
    claim_text: It provides actionable remediation steps for failed checks
    role: descriptive
    status: modeled
    span:
      start: 218
      end: 276
    payload_hash: 01ba1d01b96cb5f85fcd0bb8220ff81328a64364e06ba16538857da9a7c2be0e
    reason: Grounded by FACT-cli-doctor-1B97E0 via requires_predicate.
type: req
---

The `kibi doctor` command runs a series of diagnostic checks to verify that the local environment (SWI-Prolog version, git)
and the project KB setup (.kb directory, config, hooks) are correctly configured and healthy.
It provides actionable remediation steps for failed checks.
