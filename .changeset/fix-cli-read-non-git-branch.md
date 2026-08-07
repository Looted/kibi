---
"kibi-cli": patch
---

Read-only Kibi commands (`kibi query`, `kibi search`, `kibi status`, `kibi gaps`, `kibi coverage`, `kibi graph`) now work in non-git workspaces again, attaching to the `main` branch just like `kibi init` and `kibi migrate` already do. A recent branch-resolution fix for unborn git repos had removed that non-git fallback, which broke the packed-install smoke test and blocked npm publishing.

- Restore the `main` fallback in the CLI operation runtime only for `NOT_A_GIT_REPO` and `GIT_NOT_AVAILABLE` contexts.
- Keep propagating genuine git branch-resolution errors (detached HEAD, invalid branch, unknown) so read operations never silently attach to the wrong branch.
- Add a runtime regression test pinning non-git fallback to `main` and a second test confirming real git failures still propagate.
