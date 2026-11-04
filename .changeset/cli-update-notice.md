---
"kibi-cli": minor
---

Kibi now tells you when a newer `kibi-cli` is out. After a command run at a terminal, the CLI prints one line on stderr with both versions and the update command for your install (project package manager, npx or global), and names the KB schema move and `kibi migrate` when the new release writes a newer KB schema. `kibi doctor` reports the same answer under "Kibi updates", so agents in every host see it too.

The CLI asks the npm registry for `kibi-cli/latest` at most once a day from a detached background process and caches the answer in Kibi's per-user state directory (`update-check.json`), so no command waits on the network. The line repeats at most once a day per version and never appears when stderr is not a terminal, for JSON output (`--json`, `--format json`, `--input`), in CI and test runs, for dev builds or a source checkout. `KIBI_UPDATE_CHECK=0` or `NO_UPDATE_NOTIFIER=1` turns the check off; `KIBI_UPDATE_REGISTRY` (then `npm_config_registry`) picks the registry. `kibi-cli`'s `package.json` now declares the KB schema it writes as `kibi.kbSchema`.
