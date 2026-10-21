---
"kibi-runtime": minor
"kibi-cli": minor
"kibi-codex": minor
"kibi-claude": minor
"kibi-cursor": minor
"kibi-zcode": minor
"kibi-opencode": patch
---

Two new bundled skills cover the moments where agents most often went wrong with Kibi.

- `kibi-decisions` loads when a person states a rule ("must", "never", "from now on"), when a hook asks before an edit to code that implements a firm requirement, when the session ends without recording what changed, or when a request conflicts with a recorded rule. It shows how to read a requirement's firmness and origin, record a person's rule as firm with a reference to their words, supersede a rule with a "Why this changed" section, work through `kb_compile_intent` review candidates, and ask before overriding a firm rule.
- `kibi-commit-review` loads when `kibi check --staged` or the pre-commit hook blocks a commit, or when preparing a commit or pull-request impact review. It explains the per-file `Detail:` lines, how to add the missing symbols and refresh coordinates, which Kibi files to stage, how to prepare an impact-review record with `kb_prepare_impact_review`, and how merge commits and migration renames are judged.

`kibi-usage` now points to these skills instead of repeating their detail, and the OpenCode guidance routes rule and commit questions to them.
