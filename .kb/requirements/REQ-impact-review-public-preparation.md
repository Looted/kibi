---
title: Public complete read-only impact review preparation
status: open
tags:
  - multilingual
  - impact-policy
  - public-preparation
text_ref: documentation/impact-review-stage-e.md
semantic_text: Kibi must expose strict public impact review preparation through the installed CLI and MCP for the complete staged scope or two explicitly selected immutable commits. Kibi must return the captured inventory, snapshot, trusted base policy, provider and evaluator bindings and residual review obligations, plus a row per file with its status, disposition, analysis status, requirement ids and pending obligations. Kibi must preserve authored source and knowledge-document contents and the Git index while preparing a review without approving a review or creating proof. Kibi must return deterministic equivalent preparation data through the installed CLI and MCP for the same captured scope. Kibi must reject snapshot or trusted provider and evaluator closure drift after completing context projection and before returning preparation data. Kibi must reject review preparation when trusted base policy is missing or malformed or trusted provider and evaluator closures are unavailable or changed. Kibi must retain failed and partial source-analysis evidence and its review obligations without generating an acceptance decision.
logic_claims:
  - CLAIM-E8B10134238EFAB6
  - CLAIM-E0B55B96C5D5CE1C
  - CLAIM-0D7CD614A390E0F2
  - CLAIM-FE52FF4413708776
  - CLAIM-238A73FEB4C358D4
  - CLAIM-971E2AE632668BE6
  - CLAIM-6ABE9F954A37383F
semantic_clauses:
  - Kibi must expose strict public impact review preparation through the installed CLI and MCP for the complete staged scope or two explicitly selected immutable commits
  - Kibi must return the captured inventory, snapshot, trusted base policy, provider and evaluator bindings and residual review obligations, plus a row per file with its status, disposition, analysis status, requirement ids and pending obligations
  - Kibi must preserve authored source and knowledge-document contents and the Git index while preparing a review without approving a review or creating proof
  - Kibi must return deterministic equivalent preparation data through the installed CLI and MCP for the same captured scope
  - Kibi must reject snapshot or trusted provider and evaluator closure drift after completing context projection and before returning preparation data
  - Kibi must reject review preparation when trusted base policy is missing or malformed or trusted provider and evaluator closures are unavailable or changed
  - Kibi must retain failed and partial source-analysis evidence and its review obligations without generating an acceptance decision
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c3b7e76b42bf1a65059b0287876c2db0c66d82b41d64c0c3598688513151d3f9
semantic_inventory:
  - claim_key: CLAIM-E8B10134238EFAB6
    claim_text: Kibi must expose strict public impact review preparation through the installed CLI and MCP for the complete staged scope or two explicitly selected immutable commits
    role: normative
    status: modeled
    span:
      start: 0
      end: 165
  - claim_key: CLAIM-E0B55B96C5D5CE1C
    claim_text: Kibi must return the captured inventory, snapshot, trusted base policy, provider and evaluator bindings and residual review obligations, plus a row per file with its status, disposition, analysis status, requirement ids and pending obligations
    role: normative
    status: modeled
    span:
      start: 167
      end: 410
  - claim_key: CLAIM-0D7CD614A390E0F2
    claim_text: Kibi must preserve authored source and knowledge-document contents and the Git index while preparing a review without approving a review or creating proof
    role: normative
    status: modeled
    span:
      start: 412
      end: 566
  - claim_key: CLAIM-FE52FF4413708776
    claim_text: Kibi must return deterministic equivalent preparation data through the installed CLI and MCP for the same captured scope
    role: normative
    status: modeled
    span:
      start: 568
      end: 688
  - claim_key: CLAIM-238A73FEB4C358D4
    claim_text: Kibi must reject snapshot or trusted provider and evaluator closure drift after completing context projection and before returning preparation data
    role: normative
    status: modeled
    span:
      start: 690
      end: 837
  - claim_key: CLAIM-971E2AE632668BE6
    claim_text: Kibi must reject review preparation when trusted base policy is missing or malformed or trusted provider and evaluator closures are unavailable or changed
    role: normative
    status: modeled
    span:
      start: 839
      end: 993
  - claim_key: CLAIM-6ABE9F954A37383F
    claim_text: Kibi must retain failed and partial source-analysis evidence and its review obligations without generating an acceptance decision
    role: normative
    status: modeled
    span:
      start: 995
      end: 1124
id: REQ-impact-review-public-preparation
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well." Maintainer decision, 2026-11-19, approving these statements as worded and the staged scope first, after kb_prepare_impact_review returned about 16,000 fixed characters plus about 4,000 per file and repeated each requirement for every file that names it: "Yes, please."'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
Kibi must expose strict public impact review preparation through the installed CLI and MCP for the complete staged scope or two explicitly selected immutable commits. Kibi must return the captured inventory, snapshot, trusted base policy, provider and evaluator bindings and residual review obligations, plus a row per file with its status, disposition, analysis status, requirement ids and pending obligations. Kibi must preserve authored source and knowledge-document contents and the Git index while preparing a review without approving a review or creating proof. Kibi must return deterministic equivalent preparation data through the installed CLI and MCP for the same captured scope. Kibi must reject snapshot or trusted provider and evaluator closure drift after completing context projection and before returning preparation data. Kibi must reject review preparation when trusted base policy is missing or malformed or trusted provider and evaluator closures are unavailable or changed. Kibi must retain failed and partial source-analysis evidence and its review obligations without generating an acceptance decision.

## Why
Before this, agents had to assemble an impact review by hand. Every decision is still authored by the reviewer: the preparation returns no decisions, reviewer, time or signature, because there's no safe generic way to decide automatically. The preparation lists a row per file and leaves complete evidence to the paths a call names (REQ-impact-review-named-evidence), lists each requirement once (REQ-impact-review-requirements-once) and pages within the result budget (REQ-impact-review-preparation-paging); kb_author_impact_review writes the record (REQ-impact-review-author-write). Source: documentation/impact-review-stage-e.md, "Policy and migration"; PR 284. The compact preparation replaced a per-file copy of the evidence, the requirement entities and two schema copies, about 16,000 characters plus 4,000 per file, by maintainer decision on 2026-11-19.

## Source

> kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well." Maintainer decision, 2026-11-19, approving these statements as worded and the staged scope first, after kb_prepare_impact_review returned about 16,000 fixed characters plus about 4,000 per file and repeated each requirement for every file that names it: "Yes, please."
