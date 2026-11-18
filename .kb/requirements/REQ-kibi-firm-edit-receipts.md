---
title: kb_review_firm_edit records a keeps-or-changes receipt bound to the rule and the code
status: open
priority: must
required_evidence: tested
tags:
  - firmness
  - cli
semantic_text: kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.
semantic_clauses:
  - kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded.
  - A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-17): "kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent''s keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement''s statement and the symbol''s code when the receipt is recorded. A receipt must stop matching once the requirement''s statement changes, the requirement is superseded, or the symbol''s code changes after the receipt."'
  recorded_at: '2026-11-17T15:06:04.498Z'
rationale: An agent that judged an edit compatible with a firm rule had no way to record that judgment, so every host asked the person again and the staged gate could not tell a reviewed edit from an unreviewed one.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 43cd8f710fd90058eb46e6072fbebed7b166d67ba5001d5e63ace73e2c650d33
semantic_inventory:
  - claim_key: CLAIM-9038EBBC8FB15208
    claim_text: kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded
    role: normative
    status: modeled
    span:
      start: 0
      end: 271
  - claim_key: CLAIM-933F5EEF3E0EA6C6
    claim_text: A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt
    role: normative
    status: modeled
    span:
      start: 273
      end: 421
logic_claims:
  - CLAIM-9038EBBC8FB15208
  - CLAIM-933F5EEF3E0EA6C6
id: REQ-kibi-firm-edit-receipts
type: req
---
kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.

## Context

Benchmark runs showed agents stopping to ask the person about every edit of firm code, including edits that plainly kept the rule. The receipt lets the agent record its own judgment for one requirement and symbol, with a note, so later checks can tell reviewed code from unreviewed code. Binding it to the statement and code hashes makes it lapse as soon as either changes, so a review never covers code it did not see. Receipts live one per file under .kb/firm-edit-reviews so parallel branches do not conflict. The operation is listed as the kb_review_firm_edit MCP tool and runs as kibi review-firm-edit; the blocking finding hands the agent the exact input. It was CLI only until benchmark sessions without a runnable CLI looped hunting for it (2026-11-17).

## Source

Maintainer-approved statement (2026-11-17): "kb_review_firm_edit, also run as kibi review-firm-edit, must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt."