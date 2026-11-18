---
"kibi-cli": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
---

The commit gate and the agent hooks now share one test for a retired requirement. `kibi check --staged` used to skip a `closed` firm requirement while the hooks still asked before an edit of its code; a closed requirement is done and still governs, so the gate now asks for a `kibi review-firm-edit` receipt as well. A closed requirement that a current requirement supersedes guards nothing: the hooks no longer ask about it, `kibi check --staged` no longer gates its code, and `kibi review-firm-edit` names its successor instead of recording a receipt. The hooks now also treat `archived` and `removed` as retired, as the impact review already did.
