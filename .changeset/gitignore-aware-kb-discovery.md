---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-opencode": minor
---

Kibi now automatically respects your repository's `.gitignore` rules during knowledge base discovery. Files ignored by Git — as well as tool directories like `.sisyphus` and `.opencode` — are no longer treated as domain knowledge sources. This prevents draft and build artifacts from polluting your knowledge base.

- Added documentation describing the repository ignore policy and hard-denied directories.
- Clarified that Kibi honors repository `.gitignore`, nested `.gitignore`, and `.git/info/exclude` during `kb_autopilot_generate`, briefing generation, and discovery.
- Documented that global Git excludes are not honored in v1, and that automatic cleanup of previously-discovered KB entities is out of scope for this release.
- Integrated a note about ignore-aware file-event skipping in the OpenCode plugin README.
