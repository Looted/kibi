---
"kibi-cli": patch
---

`kibi doctor` no longer fails or tells you to run `kibi init` when a third-party hook manager (`pre-commit`, Husky, or Lefthook) owns your Git hooks and leftover Kibi-managed hook sections still sit in the effective hooks directory. Instead, the "Kibi-managed hook sections" check passes cleanly when no managed sections remain, or reports a warning naming the leftover (and any outdated) hook files with instructions to remove their `# BEGIN kibi-managed` ... `# END kibi-managed` sections and keep Kibi's commands in the hook manager's configuration.

- Reconcile `checkManagedHookSections()` in `packages/cli/src/commands/doctor.ts` with `doctorHookManager()` so repositories managed by `pre-commit`, `husky`, or `lefthook` emit a warning (`passed: true, warning: true`) with manager-specific remediation (`kibi init --print-hook all --format <manager>`) instead of failing with `Run: kibi init`.
- Preserve existing failure and `kibi init` remediation behavior when no third-party hook manager owns Git hooks.
- Update the hook-read error branch under a hook manager to give manager-appropriate remediation rather than recommending `Run: kibi init`.
