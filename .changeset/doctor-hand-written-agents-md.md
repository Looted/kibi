---
"kibi-cli": patch
---

`kibi doctor` no longer says agents in a fresh clone are not told about the KB when AGENTS.md has hand-written Kibi instructions outside the kibi-managed markers. It now says those instructions are not kept current by `kibi init`, and points at `kibi init --no-agent-instructions` to keep them as they are (or `kibi init` to add the managed section).
