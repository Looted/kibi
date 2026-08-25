---
"kibi-cli": patch
---

`kibi doctor --format json` now reports the installed `kibi-mcp` version on
normal consumer installs where the published package restricts its `exports`
map. Coordinated `kibi-cli` + `kibi-mcp` installs no longer see a misleading
"install one coordinated Kibi artifact set" instruction; that remediation now
fires only when a package is genuinely absent from the install graph.

- Resolve sibling package manifests through the package entrypoint when the
  `./package.json` subpath is not exported, instead of falling through to
  unresolved provenance.
- Extend packed npm and pnpm consumer release-contract tests with doctor
  provenance assertions (`runtime.mcpVersion`, manifest locations, and absence
  of `package-provenance-unresolved`).
- Preserve authored symbol manifest provenance (`sourceFile`, granularity, and
  role fields) when a partial `kb_upsert` payload adds relationships to an
  existing symbol; relationship-only updates no longer strip extraction
  ownership and abort coordinate refresh.
