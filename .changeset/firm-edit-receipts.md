---
"kibi-cli": minor
"kibi-agent-core": minor
"kibi-runtime": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

An edit of code that implements a current firm requirement now needs the agent's recorded verdict before it can be committed, on every host and without one. `kibi check --staged` blocks a staged change inside such a symbol (`firm_edit_unreviewed`) until each edited symbol has a current `keeps` receipt, written by the new `kibi review-firm-edit` command to `.kb/firm-edit-reviews/<REQ-id>/<file>--<symbol>.json`. A receipt is bound to the requirement's statement and the symbol's code when it is recorded, so it stops matching when either changes. A `changes` verdict keeps the change blocked (`firm_edit_breaks_rule`) until the requirement is superseded with the person's words. The finding prints the exact input to pipe to the command, and `kb_check`'s impact diagnostics report the same findings during the work.

Receipts are the agent's judgment, never the person's approval: `kibi signoff` lists each one under its requirement as judged by the agent, not approved by you. The Claude Code PreToolUse hook no longer asks about an edit whose symbols all have a current `keeps` receipt, and when nobody can answer its question it tells the agent how to record one and retry. The Codex, Cursor and ZCode pre-edit notices name the command. `KIBI_CONFIRM_FIRM_EDITS=0` still turns off only the hook question, never the staged gate. The command is CLI-only, so the MCP tool list does not grow.
