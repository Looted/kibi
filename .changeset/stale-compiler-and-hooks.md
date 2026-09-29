---
"kibi-cli": patch
"kibi-mcp": patch
---

Kibi now notices when the branch KB was compiled by a different Kibi CLI build. An older build can silently drop properties it does not know, and because sync skips unchanged files, a newer CLI never re-imported them while `kibi status` still said "fresh". Status now reports the store as stale with a `compiler_changed` reason, and the next `kibi sync` re-imports every source once.

`kibi doctor` now tells you when your installed Git hooks were written by a different Kibi version, for example a pre-commit hook that predates the generated-manifest gate. `kibi init` and `kibi doctor` also find hooks correctly in linked worktrees and with `core.hooksPath`, where `.git/hooks` under the working tree is not where Git reads hooks from.

- cli: sync stamps `compilerFingerprint` (a hash of the bundled entity property schema) into `sync-cache.json` and discards a cache stamped under a different contract. `kibi status` / `kb_status` add a `compiler_changed` stale reason (remediation `kibi sync`) and report `syncState: "stale"` until then.
- cli: new `resolveGitHooksDir` uses `git rev-parse --git-path hooks`; `kibi init` installs hooks there instead of `<cwd>/.git/hooks`, which failed in linked worktrees.
- cli: `kibi doctor` reads hooks from the resolved directory and adds a "Kibi-managed hook sections" check that fails when an installed kibi-managed section differs from the running CLI's template (remediation `kibi init`).
- repo tooling (not published): `bun run proof:baseline:semantic` compares the proof baseline without re-proving by setting aside stale-evidence gaps, and `bun run proof:replay` replays the CI proof job from `proof.yml` in a clean clone.
