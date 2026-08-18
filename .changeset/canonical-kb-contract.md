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

Advisory modeling checks still run by default, but they report as non-blocking quality diagnostics instead of failing `kibi check`. Migration rewrites the old blanket `.kb/` gitignore stanza so authored lanes are trackable, and a malformed leftover `config.json` blocks the one-way cutover instead of guessing default paths.

- Remove user-configurable entity paths and persistent `checks.rules` overrides; retire `.kb/config.json` after migration.
- Introduce `.kb/manifest.json` for Kibi-owned lifecycle metadata (schema version, semantic backfill state).
- Add one-way legacy storage migration (`documentation/` and custom configured paths → `.kb/<lane>/`).
- Split check results by enforcement class: canonical → blocking violations; advisory → quality diagnostics; migration → explicit `--rules` only. Default execution is derived from the class (no separate `runsByDefault` flag).
- Normalize legacy Kibi `.gitignore` fences during init and migrate; treat `.kb/migrations/` as derived runtime state.
- Fail closed when leftover `.kb/config.json` cannot be parsed.
- Update init, sync, hooks, staged evidence, doctor, migration-plan, and integration packages for canonical paths.
- Generate the requirement-health report on pull requests as a `kibi-pr-report` artifact; keep GitHub Pages deployment on the default branch only.
- OpenCode treats canonical `.kb/` entity lanes as knowledge that requires evidence; only derived runtime trees (and leftover `config.json`) are ignored.
- Cursor and Codex hook path policy treat canonical `.kb/` lanes as tracked knowledge, not opaque compiled-store paths.
- Pending relationship shards are not treated as symbols manifests during source discovery.
