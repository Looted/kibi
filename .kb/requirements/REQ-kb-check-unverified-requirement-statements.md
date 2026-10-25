---
title: kb_check quotes the requirements changed code implements instead of reporting a bare pass
status: open
required_evidence: tested
priority: must
tags:
  - kb
  - check
firmness: default
semantic_text: Kibi kb_check with impact diagnostics must report each current requirement that a changed behavioral symbol implements, with its statement and firmness, as a requirement_statement_unverified warning unless the requirement document changed in the same change. Kibi kb_check must not summarize a result that carries a requirement_statement_unverified warning as no violations found.
semantic_clauses:
  - Kibi kb_check with impact diagnostics must report each current requirement that a changed behavioral symbol implements, with its statement and firmness, as a requirement_statement_unverified warning unless the requirement document changed in the same change
  - Kibi kb_check must not summarize a result that carries a requirement_statement_unverified warning as no violations found
logic_claims:
  - CLAIM-1A5070F7DFD71B2E
  - CLAIM-0716C6C3A651E06B
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 3d4eaf400c8dcbba057e6f63ac4777a3f9c460f832411fcf0ab4d50e606985af
semantic_inventory:
  - claim_key: CLAIM-1A5070F7DFD71B2E
    claim_text: Kibi kb_check with impact diagnostics must report each current requirement that a changed behavioral symbol implements, with its statement and firmness, as a requirement_statement_unverified warning unless the requirement document changed in the same change
    role: exception
    status: modeled
    span:
      start: 0
      end: 257
  - claim_key: CLAIM-0716C6C3A651E06B
    claim_text: Kibi kb_check must not summarize a result that carries a requirement_statement_unverified warning as no violations found
    role: normative
    status: modeled
    span:
      start: 259
      end: 379
origin:
  kind: agent
  recorded_at: '2026-10-14T16:34:01.383Z'
id: REQ-kb-check-unverified-requirement-statements
type: req
---
Kibi kb_check with impact diagnostics must report each current requirement that a changed behavioral symbol implements, with its statement and firmness, as a requirement_statement_unverified warning unless the requirement document changed in the same change. Kibi kb_check must not summarize a result that carries a requirement_statement_unverified warning as no violations found.

## Context

In a benchmark on Kibi's own repository, agents were told by the hooks which requirement governed the code, changed the code against it anyway, and ran kb_check, which reported 0 violations because its rules compare links, coverage and facts, never code with a requirement's prose. Twelve of sixteen final answers quoted that result as if the change were consistent. Kibi cannot decide whether code still does what prose says, so the check now says what it did not compare and quotes the statement and firmness, which leaves the comparison and the question to the person with the agent. A block on code and test changes that leave the rule untouched was considered and rejected because ordinary bug fixes do exactly that. Requested by the project owner after the benchmark report.
