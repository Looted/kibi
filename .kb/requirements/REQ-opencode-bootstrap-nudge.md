---
id: REQ-opencode-bootstrap-nudge
title: OpenCode Bootstrap Nudge
status: open
created_at: 2026-05-13T00:00:00.000Z
priority: must
owner: opencode-team
tags:
  - opencode
  - kibi
  - bootstrap
  - review:context-missing
links:
  - type: specified_by
    target: SCEN-opencode-bootstrap-nudge
  - type: verified_by
    target: TEST-opencode-kibi-plugin-v1
semantic_text: The OpenCode plugin must detect uninitialized or weakly seeded repositories that declare Kibi intent. The OpenCode plugin must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan and apply contract for initial inference and seed. The OpenCode plugin must escalate to the user or operator when environment setup or repair is required.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 6936ac1c761a1fbc1e8dac7f9177e30a7c04d91b890cce5668fa9202c2cb5edc
semantic_inventory:
  - claim_key: CLAIM-0A782E5D59B95ED2
    claim_text: The OpenCode plugin must detect uninitialized or weakly seeded repositories that declare Kibi intent
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
  - claim_key: CLAIM-4E3B2FB99ED944D2
    claim_text: The OpenCode plugin must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan and apply contract for initial inference and seed
    role: normative
    status: modeled
    span:
      start: 102
      end: 261
  - claim_key: CLAIM-674B2D9C4F9B8C0C
    claim_text: The OpenCode plugin must escalate to the user or operator when environment setup or repair is required
    role: normative
    status: modeled
    span:
      start: 263
      end: 365
logic_claims:
  - CLAIM-0A782E5D59B95ED2
  - CLAIM-4E3B2FB99ED944D2
  - CLAIM-674B2D9C4F9B8C0C
type: req
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Atomic clause rewrite of the migrated requirement body (kibi migrate v5->v6).'
  approved_by: maintainer
  recorded_at: '2026-11-03T11:35:21.000Z'
failure_side_waiver: "The claim is a nudge: the plugin detects an unseeded repository and suggests onboarding. Guidance has no refusal side."
failure_side_waiver_approved_by: Piotr Franczyk
semantic_clauses:
  - The OpenCode plugin must detect uninitialized or weakly seeded repositories that declare Kibi intent.
  - The OpenCode plugin must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan and apply contract for initial inference and seed.
  - The OpenCode plugin must escalate to the user or operator when environment setup or repair is required.
firmness: default
required_evidence: tested
rationale: "Repositories that want Kibi but have no usable KB should be led to the one supported bootstrap path instead of agents improvising a KB."
---
- The OpenCode plugin must detect uninitialized or weakly seeded repositories that declare Kibi intent.
- The OpenCode plugin must route the agent to the canonical kibi-bootstrap skill and the kb_plan_bootstrap plan and apply contract for initial inference and seed.
- The OpenCode plugin must escalate to the user or operator when environment setup or repair is required.
