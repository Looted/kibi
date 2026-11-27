---
"kibi-plugin-builtin": minor
"kibi-plugin-jev": minor
"kibi-plugin-ui": minor
"kibi-runtime": patch
---

Kibi's plugin packages now declare `kibi-plugin-sdk` consistently as a peer dependency rather than a nested runtime dependency, preventing an older `kibi-cli` install from silently pulling a newer plugin version compiled against a newer `0.x` plugin SDK. `kibi-runtime` now declares `kibi-plugin-sdk` directly so consumers installing `kibi-mcp` or `kibi-runtime` always satisfy the peer requirement cleanly.

Technical summary:

- Moved `kibi-plugin-sdk` from `dependencies` to `peerDependencies` (and `devDependencies`) in `kibi-plugin-builtin`, `kibi-plugin-jev`, and `kibi-plugin-ui`, matching `kibi-plugin-search-hints` and `kibi-plugin-treesitter`.
- Added `kibi-plugin-sdk` to `kibi-runtime` `dependencies` to satisfy `kibi-plugin-builtin` and `kibi-plugin-search-hints` peer requirements.
- Hardened the npm publish workflow (`publish.yml`, `scripts/release-state.ts`, `scripts/run-release-state.ts`) to stage all tarballs under `--tag staging` with brand-new packages uploaded first, and promote `latest` in dependency order only after all uploads succeed (plus `workflow_dispatch` for clean partial reruns on `master`).
