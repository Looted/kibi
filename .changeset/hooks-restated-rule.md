---
"kibi-agent-core": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

Hook notes on every host waste fewer turns on rules that are already recorded.

- A prompt sentence that only restates a current requirement (every topic word, number and negation already in its title or one sentence of its statement) no longer triggers the rule note or the stop-time capture reminder. A new number, term or negation still reads as a rule.
- The capture reminder and the rule template say that `kb_record` returns every remaining step and approval at once, and that the approvals go to the person in one question.
- A busy file's snippet names the requirements it cannot show in full ("Also linked (N more): ...") before it drops them on the tightest budget.
