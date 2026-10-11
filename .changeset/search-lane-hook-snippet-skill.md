---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Agents working under the Kibi host hooks now have a guide to the snippet that arrives before a read or edit: which line names the governing requirements, which lists the facts the edit must keep true, which tests prove the file, what the one-line follow-up and the unowned-file and unreadable-manifest notes mean, and which `kb_check` call to run afterwards. The modeling cheatsheet also explains where a `claim_key` comes from and how to repair a mismatch instead of editing the clause text.

Technical summary: kibi-usage 2.15.2 gains a "Reading a hook snippet" section describing the lines `kibi-agent-core/snippets` renders (`Kibi knowledge for …`, `must keep true`, `Decision`, `Covered by`, `Next layer`, the `kb_check` line, `focusUpdate`, `unownedSourceNote`, `unreadableManifestNote`); host skill mirrors are regenerated. `docs/modeling-cheatsheet.md` gains a "Claim keys" section covering derivation from `claim_text`, the `kb_model` sources of the key, the mismatch error and the grounding-target rule.
