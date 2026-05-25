---
"kibi-opencode": patch
---

OpenCode users will now see reliable Kibi package versions in the startup toast regardless of whether the plugin is loaded from a repo-local copy or an installed package. The toast now displays opencode, mcp, cli, and core versions alongside structured logging. A 3-tier runtime resolver gracefully handles any resolution mode without throwing.

---
- feat: embed package version metadata into dist/version-metadata.json at build time
- feat: display kibi-opencode, kibi-mcp, kibi-cli, and kibi-core versions in startup toast
- feat: add 3-tier runtime resolver (generated-dist, workspace-packages, unknown) that never throws
- feat: include structured version metadata and unknownVersions in startup log body
