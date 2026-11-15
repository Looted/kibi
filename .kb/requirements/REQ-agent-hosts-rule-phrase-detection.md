---
title: A prompt reads as a rule only on a deontic phrase or an instructing never or always
status: open
priority: must
required_evidence: tested
tags:
  - hooks
  - agent-core
  - decisions
semantic_text: A prompt reads as a rule when one of its sentences uses a deontic phrase (must, has to, is required, is not allowed, from now on, going forward, only admins) or uses never or always as an instruction. Never or always in a sentence that describes current behavior must not make a prompt read as a rule. A question that is not a request, and text inside code, must not make a prompt read as a rule.
semantic_clauses:
  - A prompt reads as a rule when one of its sentences uses a deontic phrase (must, has to, is required, is not allowed, from now on, going forward, only admins) or uses never or always as an instruction.
  - Never or always in a sentence that describes current behavior must not make a prompt read as a rule.
  - A question that is not a request, and text inside code, must not make a prompt read as a rule.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 605faf2c3781c8d249a8aa59bbf9c49d982fbdb0a50601919e82b8b63dcd0769
semantic_inventory:
  - claim_key: CLAIM-BA90707F0D564920
    claim_text: A prompt reads as a rule when one of its sentences uses a deontic phrase (must, has to, is required, is not allowed, from now on, going forward, only admins) or uses never or always as an instruction
    role: normative
    status: modeled
    span:
      start: 0
      end: 199
  - claim_key: CLAIM-D1C3C4EEE3AA479C
    claim_text: Never or always in a sentence that describes current behavior must not make a prompt read as a rule
    role: normative
    status: modeled
    span:
      start: 201
      end: 300
  - claim_key: CLAIM-632CB059D76E0740
    claim_text: A question that is not a request, and text inside code, must not make a prompt read as a rule
    role: normative
    status: modeled
    span:
      start: 302
      end: 395
logic_claims:
  - CLAIM-BA90707F0D564920
  - CLAIM-D1C3C4EEE3AA479C
  - CLAIM-632CB059D76E0740
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-15T18:53:08.695Z'
rationale: Bare never and always matched descriptive prompts, so hosts told agents to record rules nobody had stated.
id: REQ-agent-hosts-rule-phrase-detection
type: req
---
A prompt reads as a rule when one of its sentences uses a deontic phrase (must, has to, is required, is not allowed, from now on, going forward, only admins) or uses never or always as an instruction. Never or always in a sentence that describes current behavior must not make a prompt read as a rule. A question that is not a request, and text inside code, must not make a prompt read as a rule.

## Context

The host hooks note a rule the person states in a prompt, so the agent records it as a requirement. The phrase list matched a bare never or always anywhere, so a prompt that only described current behavior ("tokens currently never expire") or asked a question read as a rule, and agents were pushed to record requirements nobody had stated. Detection now looks for deontic phrases and for never or always used as an instruction, and skips questions that are not requests and text inside code.

## Source

Maintainer-approved statement (2026-11-15): "A prompt reads as a rule when one of its sentences uses a deontic phrase (must, has to, is required, is not allowed, from now on, going forward, only admins) or uses never or always as an instruction. Never or always in a sentence that describes current behavior must not make a prompt read as a rule. A question that is not a request, and text inside code, must not make a prompt read as a rule."