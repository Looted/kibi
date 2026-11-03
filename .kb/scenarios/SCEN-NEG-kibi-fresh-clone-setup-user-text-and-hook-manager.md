---
title: Init never rewrites a user's agent instructions or a hook manager's prepare setup
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-03T15:26:55.165Z'
id: SCEN-NEG-kibi-fresh-clone-setup-user-text-and-hook-manager
type: scenario
---
Given a repository whose `AGENTS.md` already holds the team's own text, whose `CLAUDE.md` links out of the repository, or whose Git hooks belong to lefthook, husky or the pre-commit framework, when `kibi init` runs, then it refuses to change any text outside its own markers, refuses to write through a symlink that leaves the repository, and refuses to add a `prepare` step that would fight the hook manager.

This is the failure side of fresh-clone setup: automating a clone must not break a team's existing workflow. packages/cli/tests/commands/fresh-clone-setup.test.ts "append to a user's file, never touch text outside the markers, and stay idempotent", "write once through a link between AGENTS.md and CLAUDE.md, and never through a link that leaves the repository" and "leaves the prepare script alone when a hook manager owns the hooks" exercise it.