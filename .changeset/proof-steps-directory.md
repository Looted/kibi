---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kibi proof run-steps` now reads proof steps from the `proof/steps` directory by default, with one `<test_id>.json` file per proof-bearing test holding `{test_id, steps}`, and falls back to `proof/steps.json` when that directory does not exist. Adding a test's steps no longer edits a file every other branch also appends to, so parallel branches stop conflicting on it. A steps file whose `test_id` differs from its file name is refused. A project with both `proof/steps/` and `proof/steps.json` is refused with a message naming both, so a half-finished move never runs only some tests. Only regular `*.json` files whose name does not start with a dot are step files (a macOS `._*` file or a folder is skipped), and a directory with no step files says so. The optional argument (now `[steps-source]`) accepts either a directory or a JSON array file. Existing projects keep working unchanged; to move one, write each entry of `proof/steps.json` to `proof/steps/<test_id>.json` and delete the old file.
