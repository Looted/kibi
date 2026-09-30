---
"kibi-cli": patch
---

`kibi init` now distinguishes a genuine non-repository directory from directories where Git refused operationally (dubious ownership, unreadable `.git`, permission or timeout failures). The latter are refused with Git's own diagnostic before any workspace write, even when `KIBI_BRANCH` is set, instead of silently falling back to standalone workspace creation. Hook reporting for a configured `core.hooksPath` is now neutral about what happened: installation claims come only from the per-hook outcomes, so all-skipped runs no longer print "hooks were installed".
