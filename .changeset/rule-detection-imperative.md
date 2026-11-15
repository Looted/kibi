---
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-runtime": minor
"kibi-cli": minor
---

Agents are no longer told that a request sets a rule just because it describes today's behavior. A prompt such as "API keys currently never expire; add a 90-day expiry" used to trigger the "this request reads as a rule" note on "never". Now "never" and "always" count only as an instruction ("Never log keys", "make sure we always ..."), questions and code are ignored, and "must", "from now on" and the other deontic phrases count as before. The session-start text, the `kibi init` agent instructions and the kibi-usage and kibi-decisions skills now also say what a conflict is: a request that would make a recorded requirement false, including narrowing it or adding an exception. Touching the same code is not a conflict, and an agent that cannot tell asks.

`statedRule` (kibi-agent-core) splits the prompt into sentences with fenced and inline code removed, skips questions other than requests ("Can you make sure ...?"), and matches `never`/`always` only at the start of a clause or after "make sure"/"ensure". The Claude session-start context is reworded to stay within its 1,200-character budget. kibi-usage 2.49.0, kibi-decisions 1.11.0. Run `kibi init` to refresh the managed Kibi section of `AGENTS.md`.
