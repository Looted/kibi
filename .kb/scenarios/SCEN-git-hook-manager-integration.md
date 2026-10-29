---
title: Kibi leaves Git hooks to lefthook, husky or pre-commit and prints their configuration
status: active
origin:
  kind: agent
  recorded_at: '2026-10-29T18:38:29.098Z'
id: SCEN-git-hook-manager-integration
type: scenario
---
Steps:

1. In a repository with a `lefthook.yml` and a lefthook-generated pre-commit
   runner, run `kibi init`: the runner stays byte-identical, no other hook is
   written, and the output names lefthook, lists every hook whose
   configuration does not visibly run Kibi's commands and prints the lefthook
   entries to add with the command that prints them again.
2. Write the printed lefthook entries into `lefthook.yml` and run `kibi init`
   again: it confirms that lefthook already runs Kibi's hook commands and still
   installs nothing.
3. Point `core.hooksPath` at `.husky/_` with a `.husky/pre-commit` that runs
   the Kibi commit gate: `kibi init` installs nothing under `.husky/_` and
   prints husky snippets only for the post-checkout, post-merge and
   post-rewrite hooks.
4. Run `kibi init --print-hook all` with each `--format` (shell, lefthook,
   husky, pre-commit): every output covers all four hooks; the lefthook and
   pre-commit outputs parse as YAML and run `kibi sync` only on branch
   checkouts and rebases; unknown formats and `--format` without
   `--print-hook` are rejected.
5. Run `kibi doctor` with lefthook hooks configured from the printed entries:
   the three hook checks pass and name lefthook. Replace the pre-commit command
   with a task runner call: the pre-commit check is a warning, not a failure,
   and its remediation prints the lefthook entries for that hook.
