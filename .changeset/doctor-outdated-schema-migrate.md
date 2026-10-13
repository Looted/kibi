---
"kibi-cli": patch
---

`kibi doctor` now fails the `.kb/ manifest` check when the knowledge base is on an older schema than the installed Kibi expects, and its remediation names `kibi migrate`. Before, a KB on schema 8 under a CLI that expects schema 9 showed `✓ .kb/ manifest: schemaVersion 8` and the only hints were `kibi sync` and `kibi init`, neither of which upgrades the schema, so an operator following doctor hit the migration later in `kb_check` or a blocked write.

Technical summary: `checkKbManifest` compares `manifest.schemaVersion` with `LATEST_KB_SCHEMA_VERSION`; a lower version returns `passed: false`, the message `schemaVersion N (this Kibi expects M)` and a remediation that previews with `kibi migrate` and applies with `kibi migrate --yes` or `--apply-safe --approved-plan-hash`. Missing, invalid and future manifests are reported as before. The doctor behavior tests write the latest schema in their healthy fixture and add the older-schema case.
