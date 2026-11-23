---
"kibi-cli": patch
---

Kibi's Git hooks (`post-checkout`, `post-merge`, `post-rewrite`, `pre-commit`) and printed shell/husky delegation snippets now locate `node` when Git runs them in a non-login `/bin/sh` where Node version managers are not on `PATH`. Previously, `node_modules/.bin/kibi` failed with `/usr/bin/env: 'node': No such file or directory`, leaving the branch store quietly stale after `git pull`, `git merge`, or `git checkout`. Run `kibi init` to refresh existing Kibi-managed hooks in your repository.

- Probe standard Node version-manager and Unix locations in portable POSIX `sh` (`KIBI_BIN_RESOLVER` in `packages/cli/src/commands/init-helpers.ts`) whenever `node` is missing from `PATH`: `nvm` (`current`, `alias/default` exact/prefix/chained alias, and numeric highest-semver fallback under `versions/node/*`), `volta`, `fnm` (`FNM_DIR`, `XDG_DATA_HOME`, `~/.local/share/fnm`, `~/.fnm` default aliases and `node-versions/*` fallback), `asdf`, `mise`, `/opt/homebrew/bin`, and `/usr/local/bin`.
- Prepend the discovered bin directory to `PATH` and export it before resolving `KIBI_BIN` so both `#!/usr/bin/env node` shebangs and globally-installed CLIs in that version-manager directory resolve cleanly.
- If `node` still cannot be found, print an actionable remediation message to stderr pointing the user to `kibi sync` and exit `1`.
