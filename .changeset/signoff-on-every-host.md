---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-agent-core": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": patch
---

The requirements signoff view now reads well on every host, not only in the hosts that draw Kibi's fenced block.

- `kibi signoff` prints plain Markdown by default (`--format chat`): headings, quoted statements and lists that render in any chat window, and in messaging tools for agents whose replies go through one (cloud and project sessions). The path of the self-contained page `.kb/briefs/signoff/latest.html` goes to stderr, so an agent can attach or publish it next to the message. `--format md` keeps the fenced block for the OpenCode terminal card, and `KIBI_SIGNOFF_FORMAT` sets the default per host.
- After a session writes a requirement, the Claude Code, Codex, Cursor and ZCode stop hooks ask once for the signoff view before the work is reported done, unless `kibi signoff` already ran since. A requirement the agent wrote is put to the person through the view, not retold in the agent's words.
- `/kibi-signoff` is a new command in Claude Code, Cursor and ZCode.
- The `kibi-decisions` and `kibi-commit-review` skills (1.2.0) say how to show the view on each host, and `kibi-usage` (2.22.0) points to `kibi signoff` when it says to leave `approved_by` to the person. The OpenCode guidance asks for `--format md` so the terminal card still renders.
- The Claude Code plugin README shows the `.claude/settings.json` snippet that loads the plugin in cloud sessions.
