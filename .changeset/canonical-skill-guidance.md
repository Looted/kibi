---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-cursor": patch
"kibi-codex": patch
---

Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.

- Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
- Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
- Remove the obsolete retroactive-init prompt; bootstrap stays in the `init-kibi` skill.
