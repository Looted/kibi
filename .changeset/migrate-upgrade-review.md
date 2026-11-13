---
"kibi-cli": patch
---

`kibi migrate --yes` no longer says "Migration complete" while the upgrade leaves review work behind, and it leaves the store fresh. Upgrading an older KB to schemas 15-18 used to end with "Migration complete" while `kibi check` then failed on claims without subjects, subjects without definitions and unreviewed requirement pairs that the migration never mentioned, plus evidence-floor findings for requirements it had just pinned, because the store was stale until a manual `kibi sync`.

- `kibi migrate --yes` now compiles the branch store after rewriting sources, as `--apply-safe` does with its sync action (skipped, with a note, while a requirement status or inventory would make `kibi sync` reject the KB). It then runs the rules schemas 15-18 added and, when any still reports a finding, prints `Schema upgrade applied, but review work remains: kibi check reports N blocking finding(s) ...` with the count per rule and the next steps instead of `Migration complete`.
- `kibi migrate --yes` and `--dry-run` print the schema 16 review counts (suggested claim anchors to approve, claims to anchor by hand, subject definitions, duplicates and hierarchy problems). The dry run thereby lists review work as well as the automatic steps.
- After `kibi migrate --apply-safe`, the printed `Remaining plan <hash>` is the plan `kibi migrate` builds, recorded the same way, so passing that hash to `--apply-safe` works; the next apply command is printed when the plan has ready automatic actions.
- `--approved-action` or `--approved-plan-hash` without `--apply-safe` is an error (exit code 2) instead of being ignored.
- `kibi migrate` no longer prints the "schemaVersion N is older ... run 'kibi migrate'" warning about itself.
- While the KB's schema is older than the installed Kibi, the text output of `kibi status` and `kibi report` starts with one line saying so and naming `kibi migrate` (text `kibi check` has its own note).
- A claim anchor action's postcondition names the claim it clears, and its choice text says that anchoring usually turns the claim into a `related-requirement-unmodeled` pair to review.
