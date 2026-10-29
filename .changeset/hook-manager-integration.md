---
"kibi-cli": minor
---

Repositories that already manage Git hooks with lefthook, husky or the pre-commit framework no longer have two tools competing for `.git/hooks`. `kibi init` detects the manager, installs no hooks of its own and prints the configuration that runs Kibi's hook commands in that manager's format, only for the hooks it does not cover yet. `kibi doctor` now reads the manager's configuration, so a lefthook setup that runs Kibi passes instead of failing on lefthook's generated hook runner.

- `kibi init --print-hook` accepts `all` and a new `--format shell|lefthook|husky|pre-commit`; every format runs the same commands under the same conditions as the Kibi-managed hooks (`check-generated --staged --changed-only` and `check --staged` on pre-commit, `sync` on branch checkouts, merges and rebases).
- Detection: lefthook config files or lefthook-generated hook runners, `core.hooksPath` set to `.husky` or `.husky/_` or a `.husky/` directory, and `.pre-commit-config.yaml` or pre-commit-generated hooks.
- `kibi doctor` reads lefthook YAML/JSON (commands, jobs, groups, `.lefthook/<hook>/` scripts and `lefthook-local` overrides), `.husky/<hook>` and `.pre-commit-config.yaml` stages. A hook that does not visibly run Kibi's commands, for example because it calls a task runner, is a warning with the matching `--print-hook ... --format` remediation, not a failure.
- The install guide documents the exact commands and conditions of each Kibi hook with copy-paste lefthook, husky and pre-commit configurations, and the report guide shows publishing `kibi coverage` JSON and `kibi report` in an existing documentation site.
