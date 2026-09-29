---
"kibi-cli": patch
"kibi-mcp": patch
---

Kibi now notices when the branch KB was compiled by a different Kibi CLI build. An older build can silently drop properties it does not know, and because sync skips unchanged files, a newer CLI never re-imported them while `kibi status` still said "fresh". Status now reports the store as stale with a `compiler_changed` reason, and the next `kibi sync` re-imports every source once.

`kibi doctor` now tells you when your installed Git hooks were written by a different Kibi version, for example a pre-commit hook that predates the generated-manifest gate. Such a hook keeps running, so nothing looked wrong, but it silently skipped newer checks.

Deleting an entity that has outgoing relationships no longer leaves those relationships behind in `.kb/relationships/` shards. The deletion plan now removes them together with the entity, so `kibi check` no longer reports source-relationship parity violations after an approved delete.

- cli: sync stamps `compilerFingerprint` (a hash of the bundled entity property schema) into `sync-cache.json` and discards a cache stamped under a different contract. `kibi status` / `kb_status` add a `compiler_changed` stale reason (remediation `kibi sync`) and report `syncState: "stale"` until then.
- cli: `kibi doctor` adds a "Kibi-managed hook sections" check that fails when an installed kibi-managed section in the effective hooks directory differs from the running CLI's template (remediation `kibi init`). The installer and the check share one template list.
- cli: entity deletion plans (`kb_delete` → `kb_apply_plan`) add hash-bound source writes that remove the deleted entities' outgoing rows from relationship shards, via the new pure `renderShardWithout` shared with relationship deletion.
- repo tooling (not published): `bun run proof:baseline:semantic` compares the proof baseline without re-proving by setting aside stale-evidence gaps, and `bun run proof:replay` replays the CI proof job from `proof.yml` in a clean clone.
