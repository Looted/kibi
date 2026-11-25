---
"kibi-antigravity": patch
---

Fixes `Permission denied` errors when Antigravity runs Kibi lifecycle hooks from a fresh checkout or `agy plugin install` by marking `bin/run-node.cmd` and `bin/run-node.sh` executable (`100755`) in git. Also updates the Antigravity install docs to show the GitHub URL install and note that local monorepo installs must exclude `node_modules` so `agy plugin install` does not reject workspace symlinks.

- Set git mode `100755` on `packages/antigravity/bin/run-node.cmd` and `packages/antigravity/bin/run-node.sh`.
- Add POSIX executable-bit and direct-execution regression coverage in `packages/antigravity/tests/plugin-contract.test.ts`.
- Update `docs/install.md` and `packages/antigravity/README.md` with the GitHub install URL and `rsync --exclude node_modules` instructions for local monorepo installs.
