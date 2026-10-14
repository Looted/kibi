---
"kibi-agent-core": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-claude": patch
---

The Codex, Cursor and ZCode hooks now act on recorded decisions while the work happens, as the Claude Code hooks do.

- **Firm requirements before the edit.** When an edit changes code that implements a current firm requirement, the pre-edit hook tells the agent to ask the person before an edit that breaks that rule, naming the rule; once per requirement per session. These hosts cannot put the question to the person from a hook (Codex has no "ask", Cursor does not enforce one, and the ZCode adapter stays advisory), so this is a notice to the agent. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn it off.
- **Stated rules are captured.** A prompt that reads as a rule ("must", "never", "from now on") gets the note that recording it with `kb_upsert` is part of the change: through a new `UserPromptSubmit` hook in Codex and ZCode, and in Cursor through a new `beforeSubmitPrompt` hook whose note arrives with the next pre-edit message. When a session changed source files and wrote nothing with `kb_upsert`, the stop hook asks once for the decision to be recorded (Codex continues the turn with it; Cursor adds it to the stop follow-up; ZCode adds it to the Stop context).
- **Codex unlinked-file candidates** are ranked by the latest prompt's words as well as the path's.

`kibi-agent-core`: new `kibi-agent-core/decision-guard` entry with the host-neutral pieces (`firmRequirementsTouched`, `firmEditNotice`, `confirmFirmEdits`, the prompt and stop notes, and per-session markers). `kibi-claude` now imports its firm-edit and capture texts from it; behavior is unchanged.
