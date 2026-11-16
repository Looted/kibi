---
title: kibi review-firm-edit records a keeps-or-changes receipt bound to the rule and the code
status: open
priority: must
required_evidence: tested
tags:
  - firmness
  - cli
semantic_text: kibi review-firm-edit must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.
semantic_clauses:
  - kibi review-firm-edit must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded.
  - A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.
origin:
  kind: agent
  approved_by: maintainer
  ref: 'Maintainer-approved statement (2026-11-16): "kibi review-firm-edit must record the agent''s keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement''s statement and the symbol''s code when the receipt is recorded. A receipt must stop matching once the requirement''s statement changes, the requirement is superseded, or the symbol''s code changes after the receipt."'
  recorded_at: '2026-11-16T06:59:08.773Z'
rationale: An agent that judged an edit compatible with a firm rule had no way to record that judgment, so every host asked the person again and the staged gate could not tell a reviewed edit from an unreviewed one.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 898a1e39133661807deef99135eea998764d25679b350e3550a2778d4bcc6b76
semantic_inventory:
  - claim_key: CLAIM-9A3ECFE1B1F03533
    claim_text: kibi review-firm-edit must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded
    role: normative
    status: modeled
    span:
      start: 0
      end: 237
  - claim_key: CLAIM-933F5EEF3E0EA6C6
    claim_text: A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt
    role: normative
    status: modeled
    span:
      start: 239
      end: 387
logic_claims:
  - CLAIM-9A3ECFE1B1F03533
  - CLAIM-933F5EEF3E0EA6C6
id: REQ-kibi-firm-edit-receipts
type: req
---
kibi review-firm-edit must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt.

## Context

Benchmark runs showed agents stopping to ask the person about every edit of firm code, including edits that plainly kept the rule. The receipt lets the agent record its own judgment for one requirement and symbol, with a note, so later checks can tell reviewed code from unreviewed code. Binding it to the statement and code hashes makes it lapse as soon as either changes, so a review never covers code it did not see. Receipts live one per file under .kb/firm-edit-reviews so parallel branches do not conflict. The operation is CLI only; the blocking finding hands the agent the exact input.

## Source

Maintainer-approved statement (2026-11-16): "kibi review-firm-edit must record the agent's keeps or changes verdict on a symbol that implements a current firm requirement as a receipt under .kb, bound to the requirement's statement and the symbol's code when the receipt is recorded. A receipt must stop matching once the requirement's statement changes, the requirement is superseded, or the symbol's code changes after the receipt."