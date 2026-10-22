---
"kibi-cli": minor
"kibi-runtime": minor
"kibi-claude": minor
"kibi-opencode": minor
"kibi-vscode": minor
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Signoff is now one readable view instead of loose chat text. `kibi signoff` lists the requirements a change adds, rewrites, retires or affects, each quoted with its firmness, origin, scenarios and proof state, and `kibi signoff --questions` numbers the decisions waiting for you next to the recorded rule each one would change or conflict with. The output is a fenced Markdown block for the agent's reply, a self-contained HTML page (`--format html --open`) or JSON, and every run keeps the latest view in `.kb/briefs/signoff/`.

Claude Code renders the block as Markdown through a new `MessageDisplay` hook (`KIBI_SIGNOFF_DISPLAY=0` turns it off), OpenCode 2 draws it as a framed card with a `/kibi-signoff` command and a toast, and VS Code offers a **Kibi: Show Requirements Signoff** panel that refreshes as the agent updates it. The `kibi-decisions` and `kibi-commit-review` skills now tell agents when to run it.
