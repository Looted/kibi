---
"kibi-opencode": patch
---

Fix false bootstrap warnings for configured repos and add packed-artifact verification

This release fixes the false "workspace needs Kibi bootstrap" warning that appeared for workspaces already configured with `.kb/config.json` pointing at relocated `kibi-docs/*` paths.

**Bug fix:**
- The `checkWorkspaceHealth` function now correctly reads `.kb/config.json` to determine expected directory paths, instead of using hardcoded `documentation/*` paths that caused false positives for relocated documentation setups.

**Prevention:**
- Added packed-artifact regression tests (`documentation/tests/e2e/packed/opencode-bootstrap-paths.test.ts`) that verify healthy relocated paths don't emit warnings and missing targets still emit exactly one real warning.
- Added release-gate step in `.github/workflows/publish.yml` to validate the actual npm tarball behavior before publishing, preventing future source/dist/tarball drift.
- Updated `test:e2e:local` to rebuild `packages/opencode/dist` before running tests, ensuring dogfood always uses fresh builds.

**Troubleshooting:**
- Added documentation for cache recovery in `docs/troubleshooting.md` and `packages/opencode/README.md`.
- Users experiencing this issue should clear the stale plugin cache: `rm -rf "$HOME/.cache/opencode/node_modules/kibi-opencode" "$HOME/.cache/opencode/bun.lock"`