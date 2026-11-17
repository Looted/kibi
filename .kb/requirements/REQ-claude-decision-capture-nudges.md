---
title: Rules the person states are recorded during the session
status: open
required_evidence: tested
priority: must
tags:
  - hooks
  - claude-code
  - capture
semantic_text: When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change. When a session that changed source files reaches its stop without any kb_upsert write, the Stop hook must ask the agent once per session to record the decision the person stated, quoting the prompt's rule phrase when one was detected, or to say why that phrase is not a rule. After the first source edit of a session whose prompt reads as a rule, the hook must give the agent once per session a kb_upsert template for that requirement.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ba235800f2d15691f345a7da020404769c8ff9d10c62dd612a13070c73a13bab
semantic_inventory:
  - claim_key: CLAIM-7C2ABDC5442B9D18
    claim_text: When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change
    role: condition
    status: modeled
    span:
      start: 0
      end: 161
  - claim_key: CLAIM-65BD1F78CFBC6AD0
    claim_text: When a session that changed source files reaches its stop without any kb_upsert write, the Stop hook must ask the agent once per session to record the decision the person stated, quoting the prompt's rule phrase when one was detected, or to say why that phrase is not a rule
    role: condition
    status: modeled
    span:
      start: 163
      end: 437
  - claim_key: CLAIM-EA94FF6750C5A7CA
    claim_text: After the first source edit of a session whose prompt reads as a rule, the hook must give the agent once per session a kb_upsert template for that requirement
    role: normative
    status: modeled
    span:
      start: 439
      end: 597
logic_claims:
  - CLAIM-7C2ABDC5442B9D18
  - CLAIM-65BD1F78CFBC6AD0
  - CLAIM-EA94FF6750C5A7CA
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer decision, 2026-11-16, approving the Stop wording and capture template statements: "Yes, all of them"'
  recorded_at: '2026-11-16T08:45:59.092Z'
id: REQ-claude-decision-capture-nudges
type: req
semantic_clauses:
  - When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change.
  - When a session that changed source files reaches its stop without any kb_upsert write, the Stop hook must ask the agent once per session to record the decision the person stated, quoting the prompt's rule phrase when one was detected, or to say why that phrase is not a rule.
  - After the first source edit of a session whose prompt reads as a rule, the hook must give the agent once per session a kb_upsert template for that requirement.
---
When a prompt reads as a rule or decision, the kibi-claude UserPromptSubmit hook must tell the agent that recording the rule with kb_upsert is part of the change. When a session that changed source files reaches its stop without any kb_upsert write, the Stop hook must ask the agent once per session to record the decision the person stated, quoting the prompt's rule phrase when one was detected, or to say why that phrase is not a rule. After the first source edit of a session whose prompt reads as a rule, the hook must give the agent once per session a kb_upsert template for that requirement.

## Context

Agents implemented decisions the person stated and recorded none of them, so later sessions found no record of the decision and changed the behavior back. The hooks already surfaced recorded rules but nothing asked for new ones to be recorded. The Stop and post-edit behavior is shared hook code in kibi-agent-core, so the Claude Code, Codex, Cursor and ZCode hooks behave alike; Cursor delivers the template with the pre-edit message of the session's first source edit, so a session with one edit gets it too.

## Why this changed

In a benchmark session where the person stated a rule, the agent recorded nothing: the reminder came only at stop, and it offered a way out ("when there was none, the final report says so"). The Stop reminder now quotes the rule phrase and asks for the rule or a reason the phrase is not one, and the agent gets a one-call kb_upsert template right after its first source edit, while the rule is still in context.

## Source

> Maintainer decision, 2026-11-16, approving the Stop wording and capture template statements: "Yes, all of them"

Maintainer: an agent should respect recorded decisions during the work, not after it, because by then the context may have drifted.