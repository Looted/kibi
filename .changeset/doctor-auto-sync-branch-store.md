---
"kibi-cli": patch
---

`kibi doctor` no longer fails on a fresh clone or a new branch whose store simply has not been compiled yet when auto-sync is on. The next Kibi query or check compiles that store on its own, so doctor now shows a warning that says so (with `kibi sync` as the way to do it ahead of time) and exits 0. It still fails, naming `kibi sync`, when auto-sync is off (`KIBI_AUTO_SYNC=0` or `kibi.setup.autoSync: false`) or the attachment is detached, read-only or awaiting migration, since nothing compiles the store then.
