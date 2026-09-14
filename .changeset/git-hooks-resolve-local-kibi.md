---
"kibi-cli": patch
---

Git hooks installed by `kibi init` now work when kibi is installed as a project dependency, not only globally. Previously the hooks invoked bare `kibi`, but git does not put `node_modules/.bin` on a hook's `PATH`, so in projects with a local install every hook failed with `kibi: not found` — and the pre-commit hook blocked all commits. Hooks now resolve the binary at run time (PATH first, then `node_modules/.bin` walking up from the repository root, covering monorepo workspace roots) and print actionable guidance if kibi cannot be found. `kibi doctor` detects hooks from older templates and recommends re-running `kibi init`; existing repositories should re-run `kibi init` once to regenerate their hooks.

Technical details: the four hook templates in `init-helpers.ts` share a `KIBI_BIN` resolver prelude (POSIX sh, no external commands); `doctor` hook validation accepts both resolved (`"$KIBI_BIN" ...`) and legacy (bare `kibi ...`) invocations, flagging the latter as legacy; unit tests gained behavioral coverage executing the generated pre-commit with a restricted `PATH` against a stubbed local install, a parent-directory install, and an unresolvable install.
