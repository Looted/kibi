---
"kibi-cli": patch
---

Sync operations are now more resilient when multiple file edits trigger overlapping syncs. Previously, concurrent `kibi sync` runs for the same branch could collide on a shared staging directory and fail with a stale snapshot permission error. Each sync now uses an isolated staging directory, eliminating this race while preserving protection against genuine external KB mutations.

- Replace fixed `.kb/branches/<branch>.staging` with unique per-run staging directories using process ID and timestamp.
- Add automatic cleanup of abandoned staging directories left by crashed or terminated sync processes.
- Preserve atomic publish semantics and true stale-snapshot detection for external KB modifications.
- Fix invalid `specifies` relationship type in TEST-015 documentation that caused sync relationship warnings.
