---
title: kibi migrate leaves hooks a hook manager owns and hooks Kibi does not manage unchanged
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-25T09:44:06.903Z'
id: SCEN-NEG-cli-migrate-managed-hooks-refresh-hook-manager
type: scenario
---
Given a repository whose Git hooks lefthook owns (a `lefthook.yml` beside them) and whose hooks still carry outdated kibi-managed sections, when `kibi migrate --yes` runs, then it rewrites none of them and plans no refresh action. A hook without a kibi-managed section is never installed or rewritten by the refresh, and a symlinked hook is left alone with a warning. packages/cli/tests/commands/migrate-managed-hooks.test.ts "a hook manager's checkout gets no refresh" exercises it.
