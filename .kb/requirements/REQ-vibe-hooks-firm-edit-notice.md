---
title: Vibe hooks add the rule note and name a firm requirement once after an edit of its code
status: open
priority: should
firmness: default
required_evidence: tested
tags:
  - vibe
semantic_text: In a Kibi workspace, the kibi-vibe pre_agent hook must add the rule note to its context for a prompt that reads as a rule. After a Vibe edit of code that implements a current firm requirement, the kibi-vibe post_tool hook must name that requirement in its context exactly once per Vibe session.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 85af94a21b228249974008fbc1274bd11b5d232347168af7816839cd210f5452
semantic_inventory:
  - claim_key: CLAIM-99C019CBFE93357E
    claim_text: In a Kibi workspace, the kibi-vibe pre_agent hook must add the rule note to its context for a prompt that reads as a rule
    role: normative
    status: modeled
    span:
      start: 0
      end: 121
    subjects:
      - kibi.vibe.hooks.rule_note
  - claim_key: CLAIM-6F426DA0BEA06A75
    claim_text: After a Vibe edit of code that implements a current firm requirement, the kibi-vibe post_tool hook must name that requirement in its context exactly once per Vibe session
    role: normative
    status: modeled
    span:
      start: 123
      end: 293
    subjects:
      - kibi.vibe.hooks.firm_edit_notice
logic_claims:
  - CLAIM-99C019CBFE93357E
  - CLAIM-6F426DA0BEA06A75
origin:
  kind: agent
  recorded_at: '2026-11-22T18:24:19.109Z'
id: REQ-vibe-hooks-firm-edit-notice
type: req
---
In a Kibi workspace, the kibi-vibe pre_agent hook must add the rule note to its context for a prompt that reads as a rule. After a Vibe edit of code that implements a current firm requirement, the kibi-vibe post_tool hook must name that requirement in its context exactly once per Vibe session.

## Context

The kibi-vibe hooks had their own plumbing and none of the decision-guard features the other adapters share through kibi-agent-core. Vibe has no pre-tool hook, so the notice comes after the edit: it names the firm requirement, tells the agent to undo an edit that breaks it unless the person agrees, and asks for a kb_review_firm_edit verdict. The same guard adds the rule note (with the stated reason) to a prompt that states a rule, the rule-capture template on the session's first source edit after it, and the missing-git-hooks note at session start. `KIBI_CONFIRM_FIRM_EDITS=0` turns the notice off, as for the other adapters.
