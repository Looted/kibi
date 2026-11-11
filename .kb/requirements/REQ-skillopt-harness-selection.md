---
title: SkillOpt runs the harness the operator selects, defaults to Codex, and refuses unknown or unsupported harness selections
status: open
semantic_text: SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run. Codex is the default harness when the operator selects none. An unknown harness selection must be refused before any cell work. A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness.
semantic_clauses:
  - SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run
  - Codex is the default harness when the operator selects none
  - An unknown harness selection must be refused before any cell work
  - A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2e011c12c72e7c918f222234111e553603834adf81ca4863297ffb3a54c60602
semantic_inventory:
  - claim_key: CLAIM-4E4DAF500121AA55
    claim_text: SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run
    role: normative
    status: modeled
    span:
      start: 0
      end: 142
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-57F762BE23EF8AC6
    claim_text: Codex is the default harness when the operator selects none
    role: normative
    status: modeled
    span:
      start: 144
      end: 203
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B698078F8D88395D
    claim_text: An unknown harness selection must be refused before any cell work
    role: normative
    status: modeled
    span:
      start: 205
      end: 270
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-1303A759158C7688
    claim_text: A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness
    role: normative
    status: modeled
    span:
      start: 272
      end: 400
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-4E4DAF500121AA55
  - CLAIM-57F762BE23EF8AC6
  - CLAIM-B698078F8D88395D
  - CLAIM-1303A759158C7688
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:53:07.791Z'
priority: must
required_evidence: tested
tags:
  - skillopt
  - harness
  - evaluation
id: REQ-skillopt-harness-selection
type: req
---
SkillOpt must support more than one agent harness for target cells and must run the harness, models and efforts the operator selects for a run. Codex is the default harness when the operator selects none. An unknown harness selection must be refused before any cell work. A command that the selected harness cannot execute must be refused before paid preparation instead of silently switching harness.

## Context

An explicit --host wins over KIBI_SKILLOPT_HOST, and a harness that is unknown or cannot run the command is refused before paid preparation rather than silently replaced with Codex.

SkillOpt runs on more than one agent harness, so the operator's choice must be honoured exactly and no harness may be scored more leniently than another.

## Why this changed

Split from REQ-skillopt-operator-selected-harness, which held two behaviors: which harness a run uses and which selections are refused, and holding every harness to the same scoring. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
