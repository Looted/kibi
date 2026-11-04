---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
---

Every Kibi release now has one release version, such as `2026.11.0`, that names its exact package set. `kibi --version` prints it next to the CLI version (`Kibi 2026.11.0 (kibi-cli 2.41.0)`), the MCP server title names it, and `kibi doctor` gains a "Kibi release" check that warns when installed Kibi packages come from different releases. The release also declares its compatibility versions (KB schema, operation result protocol, plugin API), so compatibility questions no longer depend on individual package versions.

- kibi-core ships `release.json`: the release version (`YYYY.M.N`, counting releases within a month), every publishable package's version, and the compatibility versions. `releases/history.json` keeps every release.
- `bun run version-packages` assigns the next release version, patch-bumps kibi-core when no pending changeset does (so the manifest always ships), and rewrites the manifest and history. `bun run release:check` (CI and the publish workflow) fails when a package version drifts from the manifest.
- The publish workflow creates a `kibi@<release>` GitHub release that lists the package set, with `release.json` attached.
- `kibi doctor --format json` carries the manifest under `runtime.release`. A local pack stamped `<version>-dev.<suffix>` counts as its base version.
- Relationship shards are now read in file-name order on every filesystem, so readers and removal plans no longer depend on directory listing order.
