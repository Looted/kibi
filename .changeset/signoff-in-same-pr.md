---
"kibi-core": patch
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Agents now keep a signoff in the pull request it approves. The guidance used to time the signoff as an end-of-work step and said only that an agent must never set `approved_by` itself, so agents often opened the pull request first and then carried the person's answer in a separate follow-up pull request.

- kibi-usage 2.37.0, kibi-decisions 1.5.0 and kibi-commit-review 1.4.0 (and the signoff-views resource) say to ask for the signoff before opening or merging the pull request, and to record the person's answer (their name in `approved_by` or a `*_waiver_approved_by` field, their words in `origin.ref` or `approval_ref`) on the same branch and pull request. Writing down an answer the person gave is not self-approval. A pull request that only carries a signoff, firmness or waiver approval is ruled out.
- The stop-hook signoff reminder (Claude Code, Codex, Cursor, ZCode) adds the same rule. So do the `agent-requirement-unapproved` check action, the `dimension_unrepresented` repair hint and the waiver lines of `kibi proof explain`.
