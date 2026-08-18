---
"kibi-cli": major
"kibi-mcp": major
"kibi-runtime": major
"kibi-opencode": major
"kibi-cursor": major
"kibi-codex": major
"kibi-vscode": major
---

Kibi now uses one opinionated project contract: all Kibi-managed knowledge lives under `.kb/`, check enforcement is owned by the installed Kibi version, and projects can no longer weaken health by disabling rules or relocating entity paths in `.kb/config.json`. Existing repositories must run `kibi migrate --yes` to move legacy `documentation/...` knowledge into the canonical layout and adopt `.kb/manifest.json`.

- Remove user-configurable entity paths and persistent `checks.rules` overrides; retire `.kb/config.json` after migration.
- Introduce `.kb/manifest.json` for Kibi-owned lifecycle metadata (schema version, semantic backfill state).
- Add one-way legacy storage migration (`documentation/` and custom configured paths → `.kb/<lane>/`).
- Refactor rule registry with Kibi-owned enforcement classes (canonical, advisory, migration); preserve `--rules` as invocation-time diagnostics only.
- Update init, sync, hooks, staged evidence, doctor, migration-plan, and integration packages for canonical paths.
