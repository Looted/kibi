---
"kibi-cli": patch
---

Formatting-only source diffs no longer trigger Kibi impact review warnings. Agents and developers can now run formatter fixes without receiving semantic-review prompts for unchanged behavior, while actual copy or behavior edits still surface impact diagnostics.

- Filter formatter-only changed-file impact hunks before extracting semantic-review symbols.
- Preserve review diagnostics for meaningful text changes inside string and template literals.
- Add regression coverage for whitespace-only and trailing-comma formatter diffs.
