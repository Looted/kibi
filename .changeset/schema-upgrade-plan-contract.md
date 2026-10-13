---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

The schema upgrade in the `kb_status` / `kibi status` migration plan now declares everything `kibi migrate --yes` writes: coarse symbol links it marks `legacy-link` and the other source rewrites appear as their own actions with their own files, and `.gitignore` is listed on the upgrade itself. Approving the upgrade without those actions is refused instead of rewriting files the plan never named, and the apply result now says what the migration changed. `kb_upsert` of a non-decision entity with `firmness` now names the field, and pre-schema-9 knowledge bases are told that the schema upgrade acknowledges existing supersedes.

- `buildActionsFromStatus` takes a `planSchemaUpgradeSources` planner; `kb_status` passes the schema 6 migration fragment (the planner `kibi migrate` uses), so actions such as `symbol-legacy-link-mark` (bound to the `.kb/symbols.yaml` hash), `entity-origin-backfill` and the lifecycle repairs join the plan and `schema-config-upgrade` depends on them. While the upgrade still moves legacy knowledge or waits on an operator, it lists `.kb/` and explains why in `evidence.sourceRewrites`.
- `migrateCommand` returns a run summary built from the audit record; `kb_apply_plan` uses it for the upgrade's `actionResults[].detail` (schema versions, legacy-link marks, origin backfill, lifecycle repairs, whether `.gitignore` changed). `updateGitIgnore` reports whether it changed the file.
- The migration audit record stores the pre-run schema warning as `preMigrationWarning` instead of `warning`.
- The `supersedes-reason-missing` suggestion adds a sentence on KBs whose manifest is below schema 9.
- Upsert validation rewrites AJV's `must NOT be valid` for type-restricted fields into `<field> is only valid on <types> entities`.
