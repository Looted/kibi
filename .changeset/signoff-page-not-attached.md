---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Signoff guidance no longer tells agents to attach `latest.html` as a file. Chat apps (the Claude apps, Slack and most others) show an attached HTML file as raw source or a download, so agents now share the page only as a rendered page, such as a Claude Artifact, and otherwise leave the message text as the whole view. Updates the kibi-decisions and kibi-commit-review skills (1.2.1), the `kibi signoff` page note and the stop-hook reminder.
