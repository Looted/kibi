---
"kibi-cli": minor
---

Kibi can now run an explicitly contracted Playwright command and immediately ingest its raw reporter artifact as snapshot-bound proof. Stable Playwright case IDs and a dependency-free reporter make exact case/project coverage visible, while command mismatches, missing artifacts, retries, and stale snapshots fail closed.

- Add the CLI-only `kibi verify` orchestration command.
- Export the Playwright reporter and stable case-ID helpers.
- Add deterministic case extraction and change-to-proof evaluation utilities.
