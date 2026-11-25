---
"kibi-cli": patch
---

`kibi migrate` now refreshes the kibi-managed sections of the Git hooks (`post-checkout`, `post-merge`, `post-rewrite`, `pre-commit`) when they differ from the template the installed CLI writes. Before, an upgrade that changed a hook template left `kibi doctor` failing with "Kibi-managed hook sections: Outdated" until `kibi init` ran, and `kibi migrate --yes` did not help. The comparison is by content, so sections written by another build that carries the same version string are refreshed too.

`kibi migrate --yes` rewrites only the text between the `# BEGIN kibi-managed` and `# END kibi-managed` markers and keeps user-authored lines; `--dry-run` names the hooks it would refresh. The plan (`kibi migrate`, `--format json`) offers the same refresh as the automatic `managed_hook_sections_outdated` action (id `git-hooks-refresh`, new category `hooks`) with a SHA-256 digest of the templates it was planned with, and `--apply-safe` refuses it when the running CLI's templates differ. Hooks owned by a hook manager (lefthook, husky, pre-commit), a hooks directory outside the repository and hooks without a kibi-managed section are left alone. `kibi doctor` now names `kibi migrate --yes` as the fix.
