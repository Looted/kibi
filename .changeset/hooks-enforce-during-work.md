---
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": patch
---

The Claude Code hooks now act on recorded decisions while the work happens, not only after it.

- **Firm requirements are confirmed before the edit.** When an `Edit`, `MultiEdit`, `Write` or in-place shell write lands in a symbol that implements a current firm requirement (marked `firmness: firm`, or written by a person rather than an agent), the `PreToolUse` hook returns `permissionDecision: "ask"` with the symbol and requirement in the prompt, so the person decides before the code changes. Once an edit is allowed, that requirement is not asked about again in the session; a declined edit is asked again. The agent is told that a declined edit means the requirement stands. In a `claude -p` run with nobody to answer, Claude Code refuses the edit and the agent reads the reason. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn the prompt off.
- **Stated rules are captured.** A new `UserPromptSubmit` hook tells the agent, when a prompt reads as a rule ("must", "never", "from now on"), that recording it with `kb_upsert` is part of the change. At `Stop`, a session that changed source files and wrote nothing to the knowledge base is asked once to record the decision or say there was none.
- **An unlinked file is no longer an all-clear.** The discovery note for a file no symbol links ranks candidate requirements by the latest prompt's words as well as the path's, and, when nothing matches, says that nothing recorded is known to cover the file and that a decision made for it is recorded before the work is reported done (Codex shows the same note).

`kibi-agent-core`: `requestTopicWords`; `rankRequirementCandidates` and `requirementCandidatesForPath` take optional request words (a requirement sharing only request words needs two of them).
