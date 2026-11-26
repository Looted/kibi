---
"kibi-agent-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
"kibi-opencode": patch
"kibi-vibe": patch
"kibi-antigravity": patch
---

Agents now get Kibi's change steps where they actually look, and stop asking you about things that are not decisions. The session brief every Kibi surface opens with says when to take each step: record a rule you state in the same turn, without asking, and run the linked tests and `kb_check` with `changed: true` before the final message. `kibi init` now builds the `AGENTS.md` section from those same lines, so agents without a Kibi plugin read the same steps. A rule you state is approved by your own words: `kb_record` no longer asks you to confirm its statement, and the stop reminder skips the signoff view when that is all a session recorded. Run `kibi init` again to refresh the `AGENTS.md` section; `kibi doctor` reports it as outdated until then.

Technical summary:

- `kibi-agent-core`: `SESSION_BRIEF_LINES` reworded (record in the same turn, no permission needed; tests and `kb_check` with `changed: true` before the final message); the no-Git variant replaces that step. The firm-edit notices and the signoff stop reminder say a keeps receipt needs no approval from the person and that a rule recorded in their own words needs no signoff view.
- `kibi-cli`: `agentInstructionsFor` builds the managed `AGENTS.md` section from `sessionBriefFor`, adds whom to ask, firm-code edits, committing and the skill line; `captureFollowUp` no longer lists a statement `signoff` in `approvalsNeeded` (`CaptureApproval.kind` drops `signoff`); `kb_review_firm_edit`'s description says a receipt needs no approval.
- Skills: `kibi-usage` 3.2.0 (load-trigger description, the ask-only-for-decisions rule, call shapes, `nextActions` sent as returned, tests and changed check before the final message, levels, commit only when committing, new `resources/proof-first.md`); `kibi-decisions` 1.16.0 ("What needs the person, and what does not", level-aware recording, shorter validation list, inline `kb_review_firm_edit` shape); `recording.md` "After kb_record"; `workflows.md` recipes record through `kb_record` and the closeout contract becomes "Finishing a change"; `hook-snippets.md` documents the changed check line and `symbol_semantic_review_needed`.
- KB: `REQ-kb-upsert-approvals-needed` no longer lists the statement signoff; new `REQ-init-agent-instructions-carry-brief` and `REQ-kibi-skills-ask-only-for-decisions` with scenarios and tests.
