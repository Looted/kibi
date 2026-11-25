---
title: kibi migrate refreshes kibi-managed hook sections another CLI build wrote
status: active
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:04.145Z'
id: SCEN-cli-migrate-managed-hooks-refresh
type: scenario
---
Steps:

1. In a Git repository initialized for Kibi, the kibi-managed sections of the post-checkout, post-merge, post-rewrite and pre-commit hooks differ from the template the running CLI installs (written by another build, even one with the same version string), and pre-commit carries a user-authored line outside its section.
2. Run `kibi migrate --dry-run`: it names the four hooks it would refresh and changes none of them.
3. Run `kibi migrate --yes`: it rewrites the four kibi-managed sections with the running CLI's template, keeps the user-authored line, and prints which hooks it refreshed. `kibi doctor`'s managed hook sections check then finds nothing outdated, and a second run refreshes nothing.
4. `kibi migrate --format json` lists the refresh as the automatic `git-hooks-refresh` action with the hooks and the template digest; `kibi migrate --apply-safe <hash> --approved-action git-hooks-refresh` applies it, and the same action planned against another template digest is refused.
