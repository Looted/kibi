---
"kibi-cli": patch
---

`kibi sync` no longer fails with "Pending source is missing" for a file written on one branch and committed on a branch made after it, when no sync ran on that branch. Sync now retires a pending-source receipt whose file is absent from the checkout but committed on another local branch, since that branch's Git owns the file. A receipt whose file no local branch holds still fails the sync as missing.
